// Tabla de tipos de la primera generación (Rojo/Azul/Amarillo).
// Se respetan sus particularidades: Fantasma no afecta a Psíquico, Hielo es neutral contra Fuego
// y Bicho/Veneno son súper eficaces entre sí. Acero, Siniestro y Hada no existían.
const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon'];

const TYPE_LABELS = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
};

// Solo se listan los multiplicadores distintos de 1 (atacante -> defensor).
const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5 },
  ice: { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, bug: 2, rock: 0.5, ghost: 0.5 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 2, flying: 0.5, psychic: 2, ghost: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2 },
  ghost: { normal: 0, psychic: 0, ghost: 2 },
  dragon: { dragon: 2 },
};

// Con dos tipos defensores se multiplican ambos modificadores (p. ej. 2 x 2 = 4).
function typeEffectiveness(moveType, defenderTypes) {
  return defenderTypes.reduce((total, type) => total * (TYPE_CHART[moveType]?.[type] ?? 1), 1);
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
const generationNumber = (name = '') => ROMAN[name.replace('generation-', '')] || 99;

// PokeAPI devuelve los tipos actuales; `past_types` guarda los que tuvo hasta cierta generación
// (Clefairy era Normal antes de Hada, Magnemite era solo Eléctrico antes de Acero).
// Se toma la entrada más antigua y, por seguridad, se descartan tipos ajenos a la Gen 1.
function mapTypesFromApi(data) {
  const oldest = [...(data?.past_types || [])]
    .sort((a, b) => generationNumber(a.generation?.name) - generationNumber(b.generation?.name))[0];
  const source = oldest?.types?.length ? oldest.types : data?.types || [];
  const types = [...source]
    .sort((a, b) => (a.slot || 0) - (b.slot || 0))
    .map((entry) => entry.type?.name)
    .filter((name) => TYPES.includes(name));
  if (types.length) return [...new Set(types)].slice(0, 2);
  return source.length ? ['normal'] : [];
}

module.exports = { TYPES, TYPE_LABELS, TYPE_CHART, typeEffectiveness, mapTypesFromApi };
