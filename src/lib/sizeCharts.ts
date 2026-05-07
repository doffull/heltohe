// Size reference charts (EU standard) for AI size guide
export type SizeCategory = 'homme' | 'femme' | 'enfant';
export type Morphology = 'A' | 'H' | 'V' | 'X' | 'O';

export interface SizeChartRow {
  size: string;
  chest?: [number, number]; // cm range
  waist?: [number, number];
  hips?: [number, number];
  height?: [number, number];
  age?: [number, number]; // for kids
}

export const SIZE_CHARTS: Record<SizeCategory, SizeChartRow[]> = {
  homme: [
    { size: 'XS', chest: [82, 86], waist: [70, 74], hips: [86, 90] },
    { size: 'S',  chest: [86, 92], waist: [74, 80], hips: [90, 96] },
    { size: 'M',  chest: [92, 98], waist: [80, 86], hips: [96, 102] },
    { size: 'L',  chest: [98, 106], waist: [86, 94], hips: [102, 110] },
    { size: 'XL', chest: [106, 114], waist: [94, 102], hips: [110, 118] },
    { size: 'XXL', chest: [114, 122], waist: [102, 110], hips: [118, 126] },
    { size: 'XXXL', chest: [122, 130], waist: [110, 118], hips: [126, 134] },
  ],
  femme: [
    { size: 'XS', chest: [78, 82], waist: [60, 64], hips: [86, 90] },
    { size: 'S',  chest: [82, 86], waist: [64, 68], hips: [90, 94] },
    { size: 'M',  chest: [86, 90], waist: [68, 72], hips: [94, 98] },
    { size: 'L',  chest: [90, 96], waist: [72, 78], hips: [98, 104] },
    { size: 'XL', chest: [96, 104], waist: [78, 86], hips: [104, 112] },
    { size: 'XXL', chest: [104, 112], waist: [86, 94], hips: [112, 120] },
    { size: 'XXXL', chest: [112, 120], waist: [94, 102], hips: [120, 128] },
  ],
  enfant: [
    { size: '4A', height: [98, 104], age: [3, 4] },
    { size: '6A', height: [110, 116], age: [5, 6] },
    { size: '8A', height: [122, 128], age: [7, 8] },
    { size: '10A', height: [134, 140], age: [9, 10] },
    { size: '12A', height: [146, 152], age: [11, 12] },
    { size: '14A', height: [158, 164], age: [13, 14] },
    { size: '16A', height: [166, 172], age: [15, 16] },
  ],
};

export const MORPHOLOGIES: { value: Morphology; label: string; description: string }[] = [
  { value: 'A', label: 'A (Pyramide)', description: 'Hanches plus larges que les épaules' },
  { value: 'H', label: 'H (Rectangle)', description: 'Épaules, taille et hanches alignées' },
  { value: 'V', label: 'V (Pyramide inversée)', description: 'Épaules plus larges que les hanches' },
  { value: 'X', label: 'X (Sablier)', description: 'Taille marquée, épaules et hanches équilibrées' },
  { value: 'O', label: 'O (Ronde)', description: 'Courbes généreuses, taille peu marquée' },
];
