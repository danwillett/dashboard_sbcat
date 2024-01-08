import React, { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";
import 'chartjs-plugin-annotation';
import Chart from 'chart.js/auto'

export default function VolumeChart(props) {

        const chartRef = useRef(null);
      
        useEffect(() => {
          const ctx = chartRef.current.getContext('2d');
      
          const data = props.data
          console.log(data)
      
          const options = {
            scales: {
              x: {
                type: 'category', // Set the x-axis scale to 'category'
                labels: data.labels,
              },
              y: {
                beginAtZero: true,
              },
            },
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
      
          return () => {
            // Cleanup when the component is unmounted
            chart.destroy();
          };
        }, [props]);
      
        return <canvas ref={chartRef} />;
      };
      
