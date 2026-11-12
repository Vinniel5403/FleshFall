/**
 * Friendly PvP duel ("ดวล") — just for fun: duel HP is a copy of max HP, nothing on the
 * real character changes (no damage, no death, no loot). Fighters are snapshotted when the
 * duel starts. Pure logic; the Discord side lives in interactions/duel.ts.
 */
import { gearDef, statMod } from './character.js';
import { d20Success, type DiceRoll } from './dice.js';
import { rand } from './engine.js';
import type { Character } from './types.js';

export type DuelAction = 'hit' | 'smash' | 'guard';

/** Duel HP = this share of max HP (keeps a duel to ~10 clicks). */
const DUEL_HP = 0.6;

export interface Fighter {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  /** d20 bonus to hit (half STR mod). */
  toHit: number;
  /** what the attacker must reach: 10 + half AGI mod (+4 while guarding). */
  ac: number;
  /** flat damage bonus (third of STR mod). */
  dmg: number;
  /** damage soaked per hit (armor). */
  soak: number;
  guarding: boolean;
}

export interface Duel {
  fighters: [Fighter, Fighter];
  /** index of the fighter whose turn it is */
  turn: 0 | 1;
  round: number;
  log: string[];
  winner?: 0 | 1;
}

export interface DuelStep {
  lines: string[];
  dice?: DiceRoll;
  ended?: boolean;
}

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

const HIT = [
  '{a} ฟาดเข้ากลางหน้า {b} เต็ม ๆ',
  '{a} ตบ {b} ด้วยท่อนแขนที่ยังเปียกเลือด',
  '{a} เหวี่ยงมีดเนื้อเฉี่ยวซี่โครง {b}',
  '{a} กัด {b} — ใครสอนมาเนี่ย',
  '{a} เตะผ่าหมาก {b} อย่างไร้เกียรติ',
  '{a} เอาถาดเสิร์ฟฟาดหัว {b} ดังโป๊ก',
];
const MISS = [
  '{a} เหวี่ยงวืด ลมพัดผมปลิว',
  '{b} หลบได้แบบเนียน ๆ พร้อมยักไหล่',
  '{a} สะดุดเศษเนื้อตัวเอง',
  '{a} ตีโดนอากาศ อากาศเจ็บมาก',
  '{b} แกล้งตาย {a} เลยงง',
];
const CRIT = ['💥 {a} เข้าโหมดคลั่ง ฟาด {b} จนเลือดสาดเพดาน!', '💥 {a} ใช้ท่าไม้ตายที่ฝึกมาจากห้อง Butchery!'];
const FUMBLE = ['🤡 {a} ทำมีดหลุดมือ ตกใส่เท้าตัวเอง', '🤡 {a} ลื่นล้มหัวฟาดพื้น {b} หัวเราะลั่น'];
const GUARD = ['{a} ตั้งการ์ด เลียแผลไปพลาง', '{a} หลบหลังเคาน์เตอร์ แอบกินขนมฟื้นแรง', '{a} สวดภาวนาต่อ Icon สั้น ๆ'];

const say = (tpl: string, a: Fighter, b: Fighter) => tpl.replaceAll('{a}', `**${a.name}**`).replaceAll('{b}', `**${b.name}**`);

/** Stats are halved so luck stays king — it's a bar fight, not a ranked match. */
export function makeFighter(char: Character): Fighter {
  const str = statMod(char, 'str');
  const hp = Math.max(10, Math.round(char.maxHp * DUEL_HP));
  return {
    id: char.userId,
    name: char.name,
    hp,
    maxHp: hp,
    toHit: Math.round(str / 2),
    ac: 10 + Math.round(statMod(char, 'agi') / 2),
    dmg: Math.max(0, Math.round(str / 3)),
    soak: Math.floor(gearDef(char) / 2),
    guarding: false,
  };
}

/** Coin-flip who swings first. */
export function startDuel(a: Character, b: Character): Duel {
  const turn = Math.random() < 0.5 ? 0 : 1;
  const fighters: [Fighter, Fighter] = [makeFighter(a), makeFighter(b)];
  return { fighters, turn, round: 1, log: [`🪙 โยนเหรียญ — **${fighters[turn].name}** ได้ตีก่อน`] };
}

/** Current fighter acts. Mutates the duel (in-memory only). */
export function duelAct(d: Duel, action: DuelAction): DuelStep {
  if (d.winner !== undefined) return { lines: [] };
  const me = d.fighters[d.turn];
  const foe = d.fighters[d.turn === 0 ? 1 : 0];
  me.guarding = false; // a guard lasts until your own next turn
  const lines: string[] = [];
  let dice: DiceRoll | undefined;

  if (action === 'guard') {
    me.guarding = true;
    const heal = Math.min(me.maxHp - me.hp, rand(1, 4));
    me.hp += heal;
    lines.push(`🛡️ ${say(pick(GUARD), me, foe)}${heal ? ` (+${heal})` : ''}`);
  } else {
    const smash = action === 'smash';
    const toHit = me.toHit - (smash ? 4 : 0);
    const ac = foe.ac + (foe.guarding ? 4 : 0);
    const roll = rand(1, 20);
    const hit = d20Success(roll, toHit, ac);
    dice = {
      label: `${me.name} ${smash ? 'ทุ่มสุดตัวใส่' : 'ฟาด'} ${foe.name}`,
      mod: toHit,
      target: ac,
      rolls: [roll],
      success: hit,
      win: roll === 20 ? 'คริติคอล!' : 'โดน!',
      lose: 'วืด!',
    };
    const tag = `\`🎲 ${roll + toHit}/${ac}\``;
    if (hit) {
      let dmg = rand(1, 8) + me.dmg;
      if (smash) dmg = Math.round(dmg * 1.75);
      if (roll === 20) dmg *= 2;
      dmg = Math.max(1, dmg - foe.soak);
      foe.hp = Math.max(0, foe.hp - dmg);
      lines.push(`${smash ? '💢' : '⚔️'} ${tag} ${say(roll === 20 ? pick(CRIT) : pick(HIT), me, foe)} **-${dmg}**`);
    } else if (roll === 1) {
      const self = Math.min(me.hp - 1, rand(1, smash ? 6 : 3)); // a fumble never kills you
      me.hp -= self;
      lines.push(`${tag} ${say(pick(FUMBLE), me, foe)}${self ? ` **-${self}**` : ''}`);
    } else {
      lines.push(`💨 ${tag} ${say(pick(MISS), me, foe)}`);
    }
  }

  if (foe.hp <= 0) {
    d.winner = d.turn;
    lines.push(`🏆 **${me.name}** ชนะการดวล! **${foe.name}** นอนกองกับพื้น`);
  } else {
    d.turn = d.turn === 0 ? 1 : 0;
    if (d.turn === 0) d.round += 1;
  }
  d.log.push(...lines);
  return { lines, dice, ended: d.winner !== undefined };
}

/** Someone gives up (or timed out). */
export function duelForfeit(d: Duel, loser: 0 | 1, reason: string): void {
  if (d.winner !== undefined) return;
  d.winner = loser === 0 ? 1 : 0;
  d.log.push(`${reason} — **${d.fighters[d.winner].name}** ชนะ`);
}
