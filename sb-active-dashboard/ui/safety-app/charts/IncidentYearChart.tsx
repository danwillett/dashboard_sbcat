import { useEffect, useRef, useCallback } from "react";
import { useSafetyMapContext } from "@/lib/context/SafetyMapContext";

// Individual imports for each component used in this sample
import "@arcgis/charts-components/components/arcgis-chart";
import "@arcgis/charts-components/components/arcgis-charts-action-bar";

// Import createModel from the charts-components package
import { createModel } from "@arcgis/charts-components/model";

export default function IncidentYearChart() {
  const chartRef = useRef(null);
  const { incidentsLayer, viewRef, incidentsLayerView } = useSafetyMapContext()
  const initChart = useCallback(async () => {
    // Create a new feature layer from service URL
    if (incidentsLayer == null) return;
    await incidentsLayer.load();

    // Use querySelector to get the <arcgis-chart> element
    const chartElement = document.querySelector("arcgis-chart");
    

    // Use createModel to create a scatterplot model
    const chartModel = await createModel({ layer: incidentsLayer, chartType: "barChart" });
    chartModel.setDataFilter({
      where: "1=1"
    })
    await chartModel.setXAxisField("timestamp");
    chartModel.setTemporalBinningUnit("years")
    chartModel.setTemporalBinningSize(1)

    if (chartRef.current) {
      chartRef.current.model = chartModel;
    }
  }, [incidentsLayer]);

  // Call initChart() function to render the chart
  useEffect(() => {
    initChart().catch(console.error);
  }, [initChart]);

  // change Data filter based on new filters coming in
  

  return (
    <arcgis-chart ref={chartRef}>
      <arcgis-charts-action-bar slot="action-bar"></arcgis-charts-action-bar>
    </arcgis-chart>
  );
}