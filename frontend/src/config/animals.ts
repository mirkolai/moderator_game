// Statically resolves every animal image so each node id maps to one fixed, unique animal.
const animalModules = import.meta.glob('../img/animal_50x50/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const ANIMAL_IMAGES: string[] = Object.keys(animalModules)
  .sort()
  .map((key) => animalModules[key]);

export function getAnimalImageForNode(nodeId: number): string {
  if (ANIMAL_IMAGES.length === 0) {
    return '';
  }
  // Ids are contiguous from 0, and the animal pool exceeds the max node count,
  // so each id maps to a distinct animal.
  const index = ((nodeId % ANIMAL_IMAGES.length) + ANIMAL_IMAGES.length) % ANIMAL_IMAGES.length;
  return ANIMAL_IMAGES[index];
}
