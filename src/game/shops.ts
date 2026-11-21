/**
 * Shop stock. Admin placements (catalog.ts) rebuild these arrays in place — read them, never cache a copy.
 */
import type { Continent } from './zones.js';

/** Branch butchery stock (Rouge Land only). */
export const STOCK = ['bandage', 'alchemy_salve', 'rage_tonic', 'hide_tonic', 'bone_bomb', 'blood_wine', 'fetal_flesh', 'fresh_cut', 'wild_flour', 'lighter', 'claw_hammer', 'leather_coat', 'maid_corset', 'chainmail_apron', 'bone_saw', 'rusted_armor', 'sigil', 'placenta', 'steel_shelf'];

/** Old Realm continent shops — each city sells its continent's stock. */
export const CONTINENT_STOCK: Record<Continent, string[]> = {
  europe: ['bandage', 'absinthe', 'blood_wine', 'rage_tonic', 'walking_cane', 'kris', 'meat_hook', 'leather_coat', 'riot_vest', 'lighter'],
  asia: ['bandage', 'spice_jerky', 'instant_noodle', 'alchemy_salve', 'bone_bomb', 'carving_knife', 'katana', 'samurai_do', 'sigil'],
  america: ['bandage', 'canned_beans', 'grilled_meat', 'bone_bomb', 'claw_hammer', 'old_shotgun', 'leather_coat', 'biker_jacket', 'lighter'],
  south_america: ['bandage', 'mate_tea', 'fetal_flesh', 'rage_tonic', 'bone_club', 'machete', 'hunting_bow', 'blood_apron', 'rain_poncho'],
  africa: ['myrrh_balm', 'alchemy_salve', 'hide_tonic', 'wild_flour', 'rusty_chain', 'hunting_bow', 'bone_saw', 'rib_plate', 'sigil', 'placenta'],
  australia: ['eucalyptus_oil', 'alchemy_salve', 'hide_tonic', 'bone_bomb', 'fresh_cut', 'cricket_bat', 'boomerang', 'rusted_armor'],
  antarctica: ['whale_blubber', 'fresh_cut', 'alchemy_salve', 'hide_tonic', 'bone_bomb', 'ice_pick', 'harpoon', 'old_shotgun', 'fur_parka', 'rusted_armor'],
  unknown: ['bandage', 'alchemy_salve', 'rage_tonic', 'hide_tonic', 'bone_bomb', 'sigil', 'placenta'],
};
