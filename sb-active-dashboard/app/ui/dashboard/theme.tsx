import { createTheme } from '@mui/material/styles'
// declare module '@mui/material/styles' {
//     interface CustomPalette {
//       lightgray: Palette['primary'];

//     }
  
//     interface Palette extends CustomPalette {}
//     interface PaletteOptions extends CustomPalette {}

//   }


const fonts = ['"Avenir Next"', '"Helvetica Neue"', 'helvetica', 'Arial', 'sans-serif'].join(',')
export const dashboardTheme = createTheme({
    typography: { fontFamily: fonts },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                root: { fontFamily: fonts } ,
            },
        },
        MuiFormControl: {
            styleOverrides: {
                root: { fontFamily: fonts } ,
            },
        },
        MuiFormControlLabel: {
            styleOverrides: {
                root: { fontFamily: fonts } ,
            },
        },
        MuiFormLabel: {
            styleOverrides: {
                root: { fontFamily: fonts } ,
            },
        },
        
    },
    palette: {
        aqua: {
            main: "#047C91",
            contrastText: "#FFFFFF"
        },
        lightgray: {
            main: "#DCE1E5",
            light: "#EEF0F2",
            contrastText: "#3D4952"
        },
        mist: {
            main: "#9CBEBE",
            light: "#DAE6E6",
            contrastText: "#3D4952"
        },
        navy: {
            main: "#003660",
            contrastText: "#FFFFFF"
        },
        seagreen: {
            main: "#09847A",
            contrastText: "#FFFFFF"
        },
        white: {
            main: "#FFFFFF",
            contrastText: "#3D4952"
        }
    }
})