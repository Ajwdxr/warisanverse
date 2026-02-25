import { CrosswordLevel } from "@/types";

export const CROSSWORD_LEVELS: CrosswordLevel[] = [
  {
    id: 'level_1',
    name: 'Warisan Kita',
    difficulty: 'Mudah',
    size: 10,
    timeLimit: 300,
    words: [
      { id: '1', answer: 'CONGKAK', hint: 'Permainan tradisional menggunakan papan berlubang dan biji guli.', row: 0, col: 0, direction: 'across', length: 7 },
      { id: '2', answer: 'KAMPUNG', hint: 'Kawasan petempatan di luar bandar.', row: 0, col: 0, direction: 'down', length: 7 },
      { id: '3', answer: 'GULI', hint: 'Biji kaca kecil yang digunakan dalam permainan tuju.', row: 2, col: 0, direction: 'across', length: 4 },
      { id: '4', answer: 'GASING', hint: 'Permainan memusingkan alat kayu yang tajam di bawahnya.', row: 0, col: 5, direction: 'down', length: 6 },
      { id: '5', answer: 'WAU', hint: 'Layang-layang tradisional Kelantan.', row: 4, col: 4, direction: 'across', length: 3 },
    ]
  },
  {
    id: 'level_2',
    name: 'Budaya Bangsa',
    difficulty: 'Sederhana',
    size: 12,
    timeLimit: 420,
    words: [
      { id: '1', answer: 'BATIK', hint: 'Seni melukis kain menggunakan lilin dan pewarna.', row: 1, col: 2, direction: 'across', length: 5 },
      { id: '2', answer: 'KERIS', hint: 'Senjata tradisional Melayu yang berlok-lok.', row: 1, col: 2, direction: 'down', length: 5 },
      { id: '3', answer: 'REBANA', hint: 'Gendang besar berkulit sebelah yang dipukul dengan tangan.', row: 5, col: 0, direction: 'across', length: 6 },
      { id: '4', answer: 'SILAT', hint: 'Seni bela diri tradisional Melayu.', row: 3, col: 4, direction: 'down', length: 5 },
      { id: '5', answer: 'KOMPANG', hint: 'Alat muzik paluan yang sering digunakan dalam majlis perkahwinan.', row: 8, col: 2, direction: 'across', length: 7 },
    ]
  },
  {
    id: 'level_3',
    name: 'Adat Resam',
    difficulty: 'Sukar',
    size: 15,
    timeLimit: 600,
    words: [
      { id: '1', answer: 'PANTUN', hint: 'Puisi tradisional Melayu yang mempunyai pembayang dan maksud.', row: 2, col: 5, direction: 'across', length: 6 },
      { id: '2', answer: 'TENGKOLOK', hint: 'Perhiasan kepala lelaki Melayu yang diperbuat daripada kain songket.', row: 0, col: 8, direction: 'down', length: 9 },
      { id: '3', answer: 'SONGKET', hint: 'Kain tenunan sutera atau kapas yang bersulam benang emas atau perak.', row: 5, col: 2, direction: 'across', length: 7 },
      { id: '4', answer: 'GURINDAM', hint: 'Bentuk puisi Melayu lama yang terdiri daripada dua baris serangkap.', row: 4, col: 2, direction: 'down', length: 8 },
      { id: '5', answer: 'TEPAK', hint: 'Bekas menyimpan sirih pinang.', row: 10, col: 5, direction: 'across', length: 5 },
    ]
  }
];
