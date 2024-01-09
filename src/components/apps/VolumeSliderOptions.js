import React, { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";


import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export default function VolumeSliderOptions(inputs) {
    console.log(inputs)
    const showForm = inputs.showForm
    const handleClose = inputs.onClose
    const onApplyOptions = inputs.onApplyOptions

    const [selectedOptions, setSelectedOptions] = useState({
        bikes: false,
        peds: false,
      });
    
    const handleCheckboxChange = (name) => {
        // Update the selected options when a checkbox is changed
        setSelectedOptions((prevOptions) => ({
            ...prevOptions,
            [name]: !prevOptions[name],
        }));
    };
    
    const handleApplyOptions = () => {
        // Call the parent component's callback with the selected options
        onApplyOptions(selectedOptions);
        handleClose()
    };

    return (
        <div className="modal show d-flex align-items-center"
        // style= {{height: "70vh", width: '50vw'}}
        >
            <Modal show={showForm} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Select Options</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        
                        <Form.Check
                            inline
                            label="Bike Counts"
                            name="bikes"
                            type="checkbox"    
                            onClick={() => handleCheckboxChange("bikes")}
                            id={`bike-check`}
                        />
                        <Form.Check
                            inline
                            label="Pedestrian Counts"
                            name="peds"
                            type="checkbox"
                            onClick={() => handleCheckboxChange("peds")}
                            id={`ped-check`}
                        />
                       
                    </Form>

                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>Discard</Button>
                    <Button variant="primary" type="submit" onClick={handleApplyOptions}>Submit</Button>
                </Modal.Footer>
            </Modal>


        </div>
    )

}