import React, {useState} from "react";
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export default function MapForm(inputs) {
    console.log(inputs)
    const showForm = inputs.showForm
    const handleClose = inputs.onClose
    const {latitude, longitude} = inputs.coordinates


    console.log(latitude)
    // submit form which posts values to database
    // update form values when typing so they can view their selection... need useState() for this

    // when submitted successfully, return with a response that says "yay! sucessfully returned!!"

    // then we go crazy on it all
    return (
        <div
            className= "modal show d-flex align-items-center"
            // style= {{height: "70vh", width: '50vw'}}
        >
            <Modal show={showForm} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Add Your Favorite Place!</Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    <h2>Hey</h2>
                    <p>{latitude}</p>
                    <p>{longitude}</p>

                    <Form>
                        <Form.Group className="mb-3" controlId="formSomething">
                            <Form.Label>Email address</Form.Label>
                            <Form.Control type="email" placeholder="Enter email" />
                            <Form.Text className="text-muted">
                            We'll never share your email with anyone else.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" placeholder="Password" />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="formBasicCheckbox">
                            <Form.Check type="checkbox" label="Check me out" />
                        </Form.Group>
                        
                    </Form>

                </Modal.Body>

                <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Discard</Button>
                <Button variant="primary" type="submit" onClick={handleClose}>Submit</Button>
                </Modal.Footer>
            </Modal>
            

        </div>
    )

}