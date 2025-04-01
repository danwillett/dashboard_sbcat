// app/theme.d.ts or app/types/theme.d.ts
import { Palette, PaletteOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    aqua: PaletteColor;
    lightgray: PaletteColor;
    mist: PaletteColor;
    navy: PaletteColor;
    seagreen: PaletteColor;
    white: PaletteColor;
    coral: PaletteColor;
  }

  interface PaletteOptions {
    aqua?: PaletteColorOptions;
    lightgray?: PaletteColorOptions;
    mist?: PaletteColorOptions;
    navy?: PaletteColorOptions;
    seagreen?: PaletteColorOptions;
    white?: PaletteColorOptions;
    coral?: PaletteColorOptions;
  }
}
