import React from "react";
import { useState } from "react";

import NavTabs from './NavTabs';
import Home from "./pages/Home";
import Download from "./pages/Download";
import Tools from "./pages/Tools"

import Container from "react-bootstrap/esm/Container";

const styles = {
    head: {
        padding: '0 50px'
    },
    siteName: {
        fontSize: '30px'
    }
}

export default function PortfolioContainer() {
    const [currentPage, setCurrentPage] = useState('Home');
  
    // TODO: Add a comment describing the functionality of this method
    // depending on what value currentPage has, render a different page
    const renderPage = () => {
      if (currentPage === 'Home') {
        return <Home />;
      }
      if (currentPage === 'Download') {
        return <Download />;
      }
    //   if (currentPage === 'Blog') {
    //     return <Blog />;
    //   }
      return <Tools />;
    };
  
    const handlePageChange = (page) => setCurrentPage(page);
  
    return (
    
      <Container style={styles.head}>
        {/* <h1 style={styles.siteName}>SB County Active Transportation Data Hub</h1> */}
        
        <NavTabs currentPage={currentPage} handlePageChange={handlePageChange} />
        {renderPage()}
      </Container>

       
        

    );
  }