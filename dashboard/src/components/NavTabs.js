import React from "react";
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";

const styles = {
    navHeader: {
        fontSize: "35px",
        marginTop: "10px"
    },
    navItems: {
        marginLeft: "10px",
        marginRight: "10px",
        fontSize: "20px"
    }
}

function NavTabs({ currentPage, handlePageChange }) {
    return (
        <nav>
            <Container>
                <Row className="justify-content-left">
                    <h1 href='#' style={styles.navHeader}>SB County Active Transportation Dashboard</h1>
                </Row>
                <Row className="navbar navbar-expand-sm navbar-light">
                    <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse d-flex justify-content-left" id="navbarSupportedContent">
                        <ul className="navbar-nav justify-content-left">
                            <li className="nav-item" style={styles.navItems}>
                                <a
                                    href="#home"
                                    onClick={() => handlePageChange('Home')}
                                    className={currentPage === 'Home' ? 'nav-link active' : 'nav-link'}
                                >
                                    Home
                                </a>
                            </li>
                            <li className="nav-item" style={styles.navItems}>
                                <a

                                    href="#download"
                                    onClick={() => handlePageChange('Download')}  //makes about the active page
                                    className={currentPage === 'Download' ? 'nav-link active' : 'nav-link'}
                                >
                                    Download Data
                                </a>
                            </li>
                            
                        </ul>
                    </div>
                </Row>
            </Container>
        </nav>
    );
}

export default NavTabs;

// import Container from "react-bootstrap/Container";
// import Nav from "react-bootstrap/Nav";
// import Navbar from "react-bootstrap/Navbar";
// import NavDropdown from "react-bootstrap/NavDropdown";

// export default function NavTabs() {
//     return (
//         <Navbar expand="lg" className="bg-body-tertiary">
//             <Container>
//                 <Navbar.Brand href="#home">React-Bootstrap</Navbar.Brand>
//                 <Navbar.Toggle aria-controls="basic-navbar-nav" />
//                 <Navbar.Collapse id="basic-navbar-nav">
//                     <Nav className="me-auto">
//                         <Nav.Link href="#home">Home</Nav.Link>
//                         <Nav.Link href="#link">Link</Nav.Link>
//                         <NavDropdown title="Dropdown" id="basic-nav-dropdown">
//                             <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
//                             <NavDropdown.Item href="#action/3.2">
//                                 Another action
//                             </NavDropdown.Item>
//                             <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
//                             <NavDropdown.Divider />
//                             <NavDropdown.Item href="#action/3.4">
//                                 Separated link
//                             </NavDropdown.Item>
//                         </NavDropdown>
//                     </Nav>
//                 </Navbar.Collapse>
//             </Container>
//         </Navbar>
//     );
// }
