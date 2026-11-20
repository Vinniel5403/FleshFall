import { balance } from '../config.js';
import { applyOutcome, changeHumanity, itemCount, removeItem, statMod, statParts, stopped, type AppliedOutcome } from './character.js';
import { EVENTS, EVENTS_BY_ID } from './events/index.js';
import { rollIconDungeon, receiveBlessing } from './blessings.js';
import { feed } from './feed.js';
import { d20Success, rollTag, type DiceRoll } from './dice.js';
import { ICON_BY_DOOR, mods } from './icons.js';
import type { Character, EventChoice, EventContext, GameEventDef, IconDoor, Outcome } from './types.js';
import { DOORS, DUNGEON_RULES, isCrimsonMoon, STAT_NAMES } from './world.js';

export const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
export const chance = (p: number) => Math.random() < p;

/** Build the context passed to choice resolvers. `notes` collects side effects (e.g. Loki rerolls), `dice` every check made. */
export function makeContext(char: Character, notes: string[], dice: DiceRoll[] = []): EventContext & { rerolls: () => number } {
  const m = mods(char.icon);
  let rerolls = 0;
  return {
    char,
    rand,
    chance,
    crimsonMoon: isCrimsonMoon(),
    has: (id) => itemCount(char, id) > 0,
    rerolls: () => rerolls,
    check: (stat, dc) => {
      const mod = statMod(char, stat);
      const roll1 = () => rand(1, 20);
      let roll = roll1();
      const rolls = [roll];
      const ok = (r: number) => d20Success(r, mod, dc);
      if (!ok(roll) && m.rerollChance && chance(m.rerollChance)) {
        rerolls += 1;
        notes.push(`🎭 Loki บิดกฎฟิสิกส์ — ทอยใหม่ (${roll} → ?)`);
        roll = roll1();
        rolls.push(roll);
      }
      const total = roll + mod;
      const success = ok(roll);
      dice.push({ label: `ทอยเช็ก ${STAT_NAMES[stat]}`, mod, modLabel: STAT_NAMES[stat], parts: statParts(char, stat), target: dc, targetNote: 'ความยากของเหตุการณ์', rolls, success });
      return { success, roll, total, dc, tag: `\`${STAT_NAMES[stat]} ${rollTag(roll, mod, dc)} ${success ? '✅' : '❌'}\`` };
    },
  };
}

export function visibleChoices(char: Character, event: GameEventDef): EventChoice[] {
  return event.choices.filter((c) => !c.visible || c.visible(char));
}

function eventPool(char: Character): GameEventDef[] {
  const crimson = isCrimsonMoon();
  const run = char.run;
  if (run) {
    // the guardian waits at the end of only some runs (rolled on entry) — otherwise the last room is one more ordinary room
    const boss = run.depth >= run.maxDepth && run.boss !== false;
    const rooms = EVENTS.filter((e) => e.door === run.door && !!e.boss === boss);
    const fresh = rooms.filter((e) => !run.seen?.includes(e.id));
    return fresh.length ? fresh : rooms;
  }
  return EVENTS.filter(
    (e) =>
      !e.door &&
      e.where === char.location &&
      (e.minLevel ?? 1) <= char.level &&
      (!e.roles || e.roles.includes(char.role)) &&
      !(e.crimson === 'only' && !crimson) &&
      !(e.crimson === 'never' && crimson),
  );
}

/** `emptyChance` = overall chance of finding nothing (undefined); doors keep their own rate. */
export function pickEvent(char: Character, emptyChance = 0): GameEventDef | undefined {
  let pool = eventPool(char);
  // doors (red included) are rolled on their own so stumbling on one stays rare
  const doors = pool.filter((e) => e.finds);
  const door = doors.length > 0 && chance(balance.exploreDoorChance);
  if (!door && chance(doors.length ? emptyChance / (1 - balance.exploreDoorChance) : emptyChance)) return undefined;
  if (doors.length) pool = door ? doors : pool.filter((e) => !e.finds);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return pool[pool.length - 1]!;
}

export function getEvent(id: string): GameEventDef | undefined {
  return EVENTS_BY_ID[id];
}

/** Explore outside a dungeon: usually finds nothing (`balance.exploreEmptyChance`), else starts an event. Caller saves. */
export function startExplore(char: Character): GameEventDef | undefined {
  const ev = pickEvent(char, balance.exploreEmptyChance);
  return ev && startEvent(char, ev);
}

/** Start a new event for the character (sets pendingEvent). Caller saves. */
export function startEvent(char: Character, ev: GameEventDef = pickEvent(char)!): GameEventDef {
  char.pendingEvent = { eventId: ev.id, expiresAt: 0 };
  if (char.run) char.run.seen = [...(char.run.seen ?? []), ev.id];
  return ev;
}

export interface ChoiceResult {
  event: GameEventDef;
  choice: EventChoice;
  outcome: Outcome;
  applied: AppliedOutcome;
  notes: string[];
  /** d20 checks made while resolving, in order (for the dice animation). */
  dice: DiceRoll[];
}

/** Resolve a choice and mutate the character. Caller saves. */
export function resolveChoice(char: Character, eventId: string, choiceId: string): ChoiceResult | null {
  const event = getEvent(eventId);
  const choice = event ? visibleChoices(char, event).find((c) => c.id === choiceId) : undefined;
  if (!event || !choice) return null;

  const notes: string[] = [];
  const dice: DiceRoll[] = [];
  const ctx = makeContext(char, notes, dice);
  const outcome = choice.resolve(ctx);
  delete char.pendingEvent;
  const applied = applyOutcome(char, outcome);
  if (ctx.rerolls() > 0 && !char.fiend) changeHumanity(char, -2 * ctx.rerolls(), applied.lines);
  char.eventsCompleted += 1;

  const fell = applied.died || !!applied.downed || applied.brokeDown || applied.becameFiend;
  const alive = !fell && !applied.dying;
  if (alive && outcome.enterDungeon && char.location === 'old_realm') {
    startRun(char, outcome.enterDungeon);
  } else if (!fell && char.run && event.door) {
    // dying keeps the run: after a placenta revive the room counts as cleared
    // the last room opens the exit whether or not the guardian was there
    char.run.stage = char.run.depth >= char.run.maxDepth ? 'exit' : 'between';
  }
  return { event, choice, outcome, applied, notes, dice };
}

// ---------- dungeon navigation ----------

/** Enter a dungeon: random depth for the door, and roll whether its Icon is present and whether its guardian waits at the end. */
export function startRun(char: Character, door: IconDoor): void {
  const [lo, hi] = DUNGEON_RULES[door].depth;
  char.run = { door, depth: 0, maxDepth: rand(lo, hi), stage: 'between', icon: rollIconDungeon(char, door), boss: chance(balance.dungeonBossChance) };
}

export interface DungeonStep {
  ok: boolean;
  lines: string[];
  event?: GameEventDef;
  applied?: AppliedOutcome;
}

/** Go one room deeper. Costs stamina (or flesh if exhausted). */
export function advance(char: Character): DungeonStep {
  const run = char.run;
  if (!run || run.stage !== 'between') return { ok: false, lines: ['ไม่ได้อยู่ในดันเจียน'] };
  const o: Outcome = { text: '' };
  if (char.stamina > 0) o.stamina = -1;
  else o.hp = -3;
  if (run.door === 'white') o.hp = (o.hp ?? 0) - 3; // no food, no water
  const applied = applyOutcome(char, o);
  if (stopped(applied)) return { ok: true, lines: applied.lines, applied };
  run.depth += 1;
  const event = startEvent(char);
  return { ok: true, lines: applied.lines, event, applied };
}

export function retreat(char: Character): DungeonStep {
  const run = char.run;
  if (!run) return { ok: false, lines: ['ไม่ได้อยู่ในดันเจียน'] };
  const rule = DUNGEON_RULES[run.door].retreat;
  if (rule === 'locked') {
    return { ok: false, lines: [`🔒 ${DOORS[run.door].name}ล็อกตามหลังคุณแล้ว ต้องไปให้ถึงห้องสุดท้าย`] };
  }
  const lines: string[] = [];
  let o: Outcome = { text: '' };
  if (rule === 'feed') {
    const food = ['rotten_flesh', 'fetal_flesh', 'fresh_cut'].find((id) => itemCount(char, id) > 0);
    if (food) {
      removeItem(char, food);
      lines.push('🍖 คุณป้อนเนื้อให้ปากของดันเจียน มันจึงยอมให้ออก');
    } else {
      lines.push('🍖 ไม่มีเนื้อจะป้อน... คุณจึงเฉือนเนื้อตัวเองให้มัน');
      o = { text: '', hp: -8, humanity: -3 };
    }
  } else if (rule === 'timeloss') {
    lines.push('⬜ ประตูสุดท้ายคือประตูแรก... คุณเสียเวลาไปเท่าไรแล้ว?');
    o = { text: '', stamina: -3, sanity: -5 };
  } else {
    lines.push('⬛ คุณถอยออกทางประตูดำ');
  }
  delete char.run;
  delete char.pendingEvent;
  const applied = applyOutcome(char, o);
  return { ok: true, lines: [...lines, ...applied.lines], applied };
}

export type ExitChoice = 'black' | 'red' | 'icon';

export function exitOptions(char: Character): ExitChoice[] {
  if (!char.run || char.run.stage !== 'exit') return [];
  const opts: ExitChoice[] = ['black', 'red'];
  if (char.run.icon) opts.push('icon');
  return opts;
}

export function exitDungeon(char: Character, choice: ExitChoice): DungeonStep {
  const run = char.run;
  if (!run || !exitOptions(char).includes(choice)) return { ok: false, lines: ['ไม่มีประตูนั้น'] };
  delete char.run;
  delete char.pendingEvent;
  char.dungeonsCleared += 1;
  feed(char, 'dungeon', `**${char.name}** ผ่าน${DOORS[run.door].emoji} ${DOORS[run.door].name}${run.icon ? ' (ดันเจียน Icon)' : ''} ออกทาง${choice === 'black' ? 'ประตูดำ' : choice === 'red' ? 'ประตูแดงสู่ Cypress Isle' : `ศาลของ ${ICON_BY_DOOR[run.door].name}`}`);
  let o: Outcome;
  if (choice === 'black') {
    o = { text: '', xp: 10, travel: 'old_realm' };
  } else if (choice === 'red') {
    o = { text: '', xp: 15, travel: 'cypress' };
  } else {
    o = { text: '', xp: 50, humanity: 15, sanity: 25, hp: 20, travel: 'old_realm' };
  }
  const lines = [exitText(run.door, choice)];
  if (choice === 'icon') lines.push(...receiveBlessing(char, run.door));
  const applied = applyOutcome(char, o);
  return { ok: true, lines: [...lines, ...applied.lines], applied };
}

function exitText(door: IconDoor, choice: ExitChoice): string {
  if (choice === 'black') return '⬛ คุณก้าวผ่านประตูดำ ออกมาข้างนอกใกล้ทางเข้า — ดันเจียนเลือนหายไป';
  if (choice === 'red') return '🟥 ประตูแดงพาคุณออกมาบนเกาะซากกรีกโบราณ ทิศใต้มีแผ่นดินสีแดงฉานอยู่ลิบ ๆ';
  const icon = ICON_BY_DOOR[door];
  return `${DOORS[door].emoji} **ศาลของ ${icon.name}** — น้ำหนักมหาศาลกดทับทั้งร่าง ทุกเส้นประสาทลุกโชน คุณทรุดลงกราบโดยสัญชาตญาณ\n*${icon.concept}*`;
}
