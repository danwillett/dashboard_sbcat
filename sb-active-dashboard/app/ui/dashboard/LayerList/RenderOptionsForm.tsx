import { Radio, RadioGroup, FormControl, FormControlLabel, FormLabel, Typography } from '@mui/material';

interface props {
    fields: any,
    changeRenderField: any
}

export default function RenderOptionsForm(props: props) {

    const { fields, changeRenderField } = props
    const fonts = ['"Avenir Next"', '"Helvetica Neue"', 'helvetica', 'Arial', 'sans-serif'].join(',')

    return (
        <FormControl sx={{fontFamily: fonts}}>
                <FormLabel sx={{ fontSize: '14px', fontFamily: fonts}} id="render-options">Select an attribute</FormLabel>
                <RadioGroup
                aria-labelledby="render-options"
                defaultValue={fields[0].name}
                name="radio-buttons-group"
                >
                    { fields.map((attribute) => (
                        <FormControlLabel 
                           
                            key={attribute.name} 
                            value={attribute.name} 
                            control={
                                <Radio 
                                    sx={{
                                        '& .MuiSvgIcon-root': {
                                        fontSize: 20,
                                        }
                                    }}
                                    onClick={changeRenderField} 
                                />}
                            label={attribute.alias} 
                            slotProps={{
                                typography: {
                                  sx: { fontSize: '14px', fontFamily: "Avenir Next, Helvetica Neue, helvetica, Arial, sans-serif" },
                                },
                              }}
                            />
                    ))}
                    
                </RadioGroup>
        </FormControl>
    )
    

}