import React, { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";
import 'chartjs-plugin-annotation';
import Chart from 'chart.js/auto'

export default function VolumeChart(props) {
        const chartRef = useRef(null)
        const [chart, setChart] = useState(null)
        // const chartRef = props.chartRef
        
        if (chart !== null) {
          // update chart
          chart.data.datasets[0].data = props.data.datasets[0].data
          chart.update()
        }

        const formatLabels = (labels) => {

          return labels.map((label) => {
              return label.replace(/\bWest\b/g, 'W')
                          .replace(/\bEast\b/g, 'E')
                          .replace(/\bNorth\b/g, 'N')
                          .replace(/\bSouth\b/g, 'S')
                          .replace(/\bStreet\b/g, 'St')
                          .replace(/\bAvenue\b/g, 'Ave')
                          .replace(/\bRoad\b/g, 'Rd')
                          .replace(/\bBoulevard\b/g, 'Blvd')
                          .replace(/\bLane\b/g, 'Ln')
                          .replace(/\bDrive\b/g, 'Dr')
                          .replace(/\bCourt\b/g, 'Ct')
                          .replace(/\bPlace\b/g, 'Pl')
                          .replace(/\bSquare\b/g, 'Sq')
                          .replace(/\bCircle\b/g, 'Cir')
                          .replace(/\bTerrace\b/g, 'Ter')
                          .replace(/\bParkway\b/g, 'Pkwy')
                          .replace(/\bWay\b/g, 'Way')
                          .replace(/&(.*?)&.*?$/, '&$1');
          })
        }
      
        useEffect(() => {
          console.log(chartRef.current)
          const ctx = chartRef.current.getContext('2d');
      
          let data = props.data
          
      
          const options = {
            scales: {
              y: {
                type: 'category', // Set the x-axis scale to 'category'
                labels: formatLabels(data.labels),
              },
              x: {
                beginAtZero: true,
              },
              
            },
            indexAxis:'y',
          };
      
          const chart = new Chart(ctx, {
            type: 'bar',
            
            data: data,
            options: options,
            plugins: [
              {
                // Add any annotations if needed
              },
            ],
          });

          setChart(chart)
      
          return () => {
            // Cleanup when the component is unmounted
            chart.destroy();
          };
        }, []);


      
        return <canvas ref={chartRef} />;
      };
      
