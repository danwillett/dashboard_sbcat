import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataQueryMap from "@/ui/data-query-app/components/DataQueryMap";
import DataQueryMapWidgets from "@/ui/data-query-app/components/DataQueryMapWidgets";
import InfrastructureEquityLeftSidebar, {
  EquitySetupPhase,
  EquitySetupStep,
} from "@/ui/infrastructure-equity-app/layout/InfrastructureEquityLeftSidebar";
import InfrastructureEquityRightSidebar from "@/ui/infrastructure-equity-app/layout/InfrastructureEquityRightSidebar";
import EquityBivariateLegend from "@/ui/infrastructure-equity-app/components/EquityBivariateLegend";
import {
  CatalogCategoryNode,
  fetchCatalogTree,
  filterVisibleCatalogTree,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import {
  EquityContextCategoryKind,
  collectInfrastructureEquityDatasets,
  collectDemographicsContextDatasets,
  inferEquityGeographyUnit,
  EquityGeographyUnit,
} from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import {
  detectDemographicsGeographySupport,
  detectDemographicsIndicatorBlockGroupSupport,
  DemographicsGeographySupport,
  isTractOnlyDemographicsSupport,
} from "@/lib/infrastructure-equity-app/infrastructureEquityDemographicsGeography";
import {
  DEFAULT_INFRASTRUCTURE_COMFORT_SELECTION,
  InfrastructureComfortSelection,
  isInfrastructureComfortSelectionValid,
} from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  createDefaultEquityGeographicFilter,
  EquityGeographicFilter,
  EquityGeographicLevel,
  listEquityJurisdictionPlaceNames,
  resolveEquityBoundaryGeometry,
} from "@/lib/infrastructure-equity-app/infrastructureEquityGeography";
import { runInfrastructureEquityAnalysis } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import {
  loadNumericContextFields,
  pickDefaultNumericContextField,
} from "@/lib/infrastructure-equity-app/infrastructureEquityContextFields";
import {
  addPinnedEquityAnalysisToMap,
  removeAllEquityAnalysisLayersFromMap,
  removeBikeComfortReferenceLayerFromMap,
  removeContextReferenceLayerFromMap,
  resetGeographicExtentPreviewCache,
  removeGeographicExtentPreviewLayerFromMap,
  removePinnedEquityAnalysisFromMap,
  syncBikeComfortReferenceLayer,
  syncContextReferenceLayer,
  syncGeographicExtentPreviewLayer,
  zoomMapToEquityGeographicExtent,
} from "@/lib/infrastructure-equity-app/infrastructureEquityMapLayers";
import {
  createPinnedEquityAnalysis,
  PinnedEquityAnalysis,
} from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";
import "@/ui/data-query-app/data-query-map-widgets.css";

export default function InfrastructureEquityApp() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [tree, setTree] = useState<CatalogCategoryNode[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [phase, setPhase] = useState<EquitySetupPhase>("intro");
  const [setupStep, setSetupStep] = useState<EquitySetupStep>("geographic");
  const [infrastructureDatasetId, setInfrastructureDatasetId] = useState<
    number | null
  >(null);
  const [infrastructureComfortSelection, setInfrastructureComfortSelection] =
    useState<InfrastructureComfortSelection>(
      DEFAULT_INFRASTRUCTURE_COMFORT_SELECTION
    );
  const [contextKind, setContextKind] =
    useState<EquityContextCategoryKind | null>(null);
  const [contextDatasetId, setContextDatasetId] = useState<number | null>(null);
  const [selectedContextFields, setSelectedContextFields] = useState<string[]>(
    []
  );
  const [contextFieldOptions, setContextFieldOptions] = useState<__esri.Field[]>(
    []
  );
  const [contextFieldsLoading, setContextFieldsLoading] = useState(false);
  const [contextFieldsError, setContextFieldsError] = useState<string | null>(
    null
  );

  const [pinnedAnalyses, setPinnedAnalyses] = useState<PinnedEquityAnalysis[]>(
    []
  );
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [geographicFilter, setGeographicFilter] = useState<EquityGeographicFilter>(
    createDefaultEquityGeographicFilter
  );
  const [jurisdictionPlaces, setJurisdictionPlaces] = useState<string[]>([]);
  const [jurisdictionPlacesLoading, setJurisdictionPlacesLoading] =
    useState(false);
  const [bikeComfortVisible, setBikeComfortVisible] = useState(false);
  const [contextLayerVisible, setContextLayerVisible] = useState(false);
  const [demographicsGeographyUnit, setDemographicsGeographyUnit] =
    useState<EquityGeographyUnit>("tract");
  const [demographicsGeographySupport, setDemographicsGeographySupport] =
    useState<Record<number, DemographicsGeographySupport>>({});
  const [demographicsIndicatorBlockGroupSupport, setDemographicsIndicatorBlockGroupSupport] =
    useState<Record<number, Record<string, boolean>>>({});

  const mapViewRef = useRef(mapView);
  mapViewRef.current = mapView;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const rawTree = await fetchCatalogTree();
        if (cancelled) return;
        setTree(filterVisibleCatalogTree(rawTree));
      } catch (error) {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Failed to load catalog datasets."
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      removeAllEquityAnalysisLayersFromMap(mapViewRef.current);
      removeBikeComfortReferenceLayerFromMap(mapViewRef.current);
      removeContextReferenceLayerFromMap(mapViewRef.current);
      removeGeographicExtentPreviewLayerFromMap(mapViewRef.current);
    };
  }, []);

  const infrastructureDataset = useMemo(
    () =>
      infrastructureDatasetId
        ? findDatasetInTree(tree, infrastructureDatasetId)
        : null,
    [tree, infrastructureDatasetId]
  );

  const contextDataset = useMemo(
    () =>
      contextDatasetId ? findDatasetInTree(tree, contextDatasetId) : null,
    [tree, contextDatasetId]
  );

  const activeAnalysis = useMemo(
    () =>
      pinnedAnalyses.find((entry) => entry.id === activeAnalysisId) ?? null,
    [pinnedAnalyses, activeAnalysisId]
  );

  useEffect(() => {
    if (phase !== "setup" || setupStep !== "infrastructure") return;
    if (infrastructureDatasetId != null) return;

    const datasets = collectInfrastructureEquityDatasets(tree);
    if (datasets.length > 0) {
      setInfrastructureDatasetId(datasets[0].id);
    }
  }, [phase, setupStep, tree, infrastructureDatasetId]);

  useEffect(() => {
    if (!contextDataset) {
      setContextFieldOptions([]);
      setSelectedContextFields([]);
      setContextFieldsError(null);
      return;
    }

    let cancelled = false;
    setContextFieldsLoading(true);
    setContextFieldsError(null);

    (async () => {
      try {
        const fields = await loadNumericContextFields(
          contextDataset,
          contextKind
        );
        if (cancelled) return;
        setContextFieldOptions(fields);
        const defaultField = pickDefaultNumericContextField(fields, {
          contextKind,
          dataset: contextDataset,
        });
        setSelectedContextFields(defaultField ? [defaultField.name] : []);

        if (contextKind === "demographics") {
          const indicatorSupport = await detectDemographicsIndicatorBlockGroupSupport(
            contextDataset,
            fields.map((field) => field.name)
          );
          if (!cancelled) {
            setDemographicsIndicatorBlockGroupSupport((prev) => ({
              ...prev,
              [contextDataset.id]: indicatorSupport,
            }));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setContextFieldOptions([]);
          setSelectedContextFields([]);
          setContextFieldsError(
            error instanceof Error
              ? error.message
              : "Failed to load context layer fields."
          );
        }
      } finally {
        if (!cancelled) setContextFieldsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contextDataset, contextKind]);

  const demographicsDatasetIds = useMemo(() => {
    if (contextKind !== "demographics") return [];
    return collectDemographicsContextDatasets(tree).map((dataset) => dataset.id);
  }, [contextKind, tree]);

  useEffect(() => {
    if (demographicsDatasetIds.length === 0) {
      setDemographicsGeographySupport({});
      return;
    }

    let cancelled = false;

    (async () => {
      const datasets = collectDemographicsContextDatasets(tree);
      const entries = await Promise.all(
        datasets.map(async (dataset) => {
          const support = await detectDemographicsGeographySupport(dataset);
          return [dataset.id, support] as const;
        })
      );
      if (!cancelled) {
        setDemographicsGeographySupport(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contextKind, demographicsDatasetIds, tree]);

  useEffect(() => {
    if (
      contextKind !== "demographics" ||
      demographicsGeographyUnit !== "block" ||
      !contextDatasetId
    ) {
      return;
    }

    const support = demographicsIndicatorBlockGroupSupport[contextDatasetId];
    if (!support) return;

    setSelectedContextFields((prev) =>
      prev.filter((fieldName) => support[fieldName])
    );
  }, [
    contextKind,
    contextDatasetId,
    demographicsGeographyUnit,
    demographicsIndicatorBlockGroupSupport,
  ]);

  useEffect(() => {
    if (contextKind !== "demographics" || !contextDatasetId) return;
    const support = demographicsGeographySupport[contextDatasetId];
    if (
      isTractOnlyDemographicsSupport(support) &&
      demographicsGeographyUnit === "block"
    ) {
      setDemographicsGeographyUnit("tract");
    }
  }, [
    contextKind,
    contextDatasetId,
    demographicsGeographySupport,
    demographicsGeographyUnit,
  ]);

  const contextGeographyUnit =
    contextDataset && contextKind
      ? contextKind === "demographics"
        ? demographicsGeographyUnit
        : inferEquityGeographyUnit(contextDataset, contextKind)
      : null;

  useEffect(() => {
    if (!mapView) return;

    const active = phase !== "intro";

    (async () => {
      await syncGeographicExtentPreviewLayer(
        mapView,
        active,
        active ? geographicFilter : null
      );
    })();
  }, [mapView, phase, geographicFilter]);

  useEffect(() => {
    if (!mapView) return;

    let cancelled = false;

    (async () => {
      const boundaryGeometry =
        geographicFilter.level === "county"
          ? null
          : await resolveEquityBoundaryGeometry(geographicFilter);

      if (cancelled) return;

      const previewActive = phase !== "intro";

      await syncBikeComfortReferenceLayer(
        mapView,
        previewActive && bikeComfortVisible ? infrastructureDataset : null,
        bikeComfortVisible,
        boundaryGeometry,
        infrastructureComfortSelection
      );

      await syncContextReferenceLayer(
        mapView,
        previewActive && contextLayerVisible ? contextDataset : null,
        contextLayerVisible,
        boundaryGeometry,
        selectedContextFields,
        contextKind,
        contextGeographyUnit
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    mapView,
    phase,
    bikeComfortVisible,
    contextLayerVisible,
    infrastructureDataset,
    contextDataset,
    selectedContextFields,
    contextKind,
    contextGeographyUnit,
    geographicFilter,
    infrastructureComfortSelection,
  ]);

  useEffect(() => {
    const level = geographicFilter.level;
    if (level !== "city" && level !== "service-area") {
      return;
    }

    if (phase !== "setup" && phase !== "review") {
      return;
    }

    let cancelled = false;
    setJurisdictionPlacesLoading(true);

    listEquityJurisdictionPlaceNames(level)
      .then((places) => {
        if (cancelled) return;
        setJurisdictionPlaces(places);
      })
      .catch(() => {
        if (!cancelled) setJurisdictionPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setJurisdictionPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [phase, setupStep, geographicFilter.level]);

  useEffect(() => {
    if (
      geographicFilter.level !== "city" &&
      geographicFilter.level !== "service-area"
    ) {
      return;
    }
    if (
      jurisdictionPlacesLoading ||
      jurisdictionPlaces.length === 0 ||
      geographicFilter.placeName
    ) {
      return;
    }

    setGeographicFilter((prev) => ({
      ...prev,
      placeName: jurisdictionPlaces[0],
    }));
  }, [
    geographicFilter.level,
    geographicFilter.placeName,
    jurisdictionPlaces,
    jurisdictionPlacesLoading,
  ]);

  const canRunAnalysis =
    infrastructureDataset != null &&
    isInfrastructureComfortSelectionValid(infrastructureComfortSelection) &&
    contextKind != null &&
    contextDataset != null &&
    selectedContextFields.length > 0 &&
    !contextFieldsLoading &&
    (geographicFilter.level === "county" ||
      (!jurisdictionPlacesLoading &&
        geographicFilter.placeName != null &&
        jurisdictionPlaces.includes(geographicFilter.placeName)));

  const handleStartSetup = useCallback(() => {
    setPhase("setup");
    setSetupStep("geographic");
    setAnalysisError(null);
    setGeographicFilter(createDefaultEquityGeographicFilter());
  }, []);

  const handleBackToIntro = useCallback(() => {
    setPhase("intro");
    setSetupStep("geographic");
    setAnalysisError(null);
  }, []);

  const handleGeographicStepAdvance = useCallback(async () => {
    await zoomMapToEquityGeographicExtent(mapViewRef.current, geographicFilter);
    setSetupStep("infrastructure");
    setAnalysisError(null);
  }, [geographicFilter]);

  const handleGeographicLevelChange = useCallback(
    (level: EquityGeographicLevel) => {
      resetGeographicExtentPreviewCache();
      setGeographicFilter({
        level,
        placeName: null,
      });
      setAnalysisError(null);
    },
    []
  );

  const handleGeographicPlaceChange = useCallback((placeName: string) => {
    resetGeographicExtentPreviewCache();
    setGeographicFilter((prev) => ({ ...prev, placeName }));
    setAnalysisError(null);
  }, []);

  const handleContextKindChange = useCallback(
    (kind: EquityContextCategoryKind) => {
      setContextKind(kind);
      setContextDatasetId(null);
      setSelectedContextFields([]);
      setContextLayerVisible(false);
      setAnalysisError(null);
    },
    []
  );

  const handleRemovePinnedAnalysis = useCallback((analysisId: string) => {
    removePinnedEquityAnalysisFromMap(mapViewRef.current, analysisId);
    setPinnedAnalyses((prev) => {
      const next = prev.filter((entry) => entry.id !== analysisId);
      setActiveAnalysisId((current) => {
        if (current !== analysisId) return current;
        return next[next.length - 1]?.id ?? null;
      });
      return next;
    });
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    if (
      !mapView ||
      !infrastructureDataset ||
      !isInfrastructureComfortSelectionValid(infrastructureComfortSelection) ||
      !contextKind ||
      !contextDataset ||
      selectedContextFields.length === 0
    ) {
      return;
    }

    setAnalysisRunning(true);
    setAnalysisError(null);
    setAnalysisProgress(null);

    try {
      const geographyUnit =
        contextKind === "demographics"
          ? demographicsGeographyUnit
          : inferEquityGeographyUnit(contextDataset, contextKind);
      const result = await runInfrastructureEquityAnalysis({
        infrastructureDataset,
        contextDataset,
        infrastructureComfortSelection,
        contextFields: selectedContextFields,
        geographyUnit,
        geographicFilter,
        contextKind,
        onProgress: (completed, total) =>
          setAnalysisProgress({ completed, total }),
      });

      const pinned = createPinnedEquityAnalysis(
        result,
        infrastructureDataset.id,
        contextDataset.id
      );

      await addPinnedEquityAnalysisToMap(mapView, pinned, contextDataset);

      setPinnedAnalyses((prev) => [...prev, pinned]);
      setActiveAnalysisId(pinned.id);
      setPhase("review");
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Equity analysis failed."
      );
    } finally {
      setAnalysisRunning(false);
      setAnalysisProgress(null);
    }
  }, [
    mapView,
    infrastructureDataset,
    infrastructureComfortSelection,
    contextKind,
    contextDataset,
    selectedContextFields,
    demographicsGeographyUnit,
    geographicFilter,
  ]);

  return (
    <div
      id="infrastructure-equity-app"
      className="flex h-full min-h-0 w-full bg-white"
    >
      <InfrastructureEquityLeftSidebar
        isCollapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((prev) => !prev)}
        tree={tree}
        loading={catalogLoading}
        error={catalogError}
        phase={phase}
        setupStep={setupStep}
        onSetupStepChange={setSetupStep}
        onGeographicStepAdvance={handleGeographicStepAdvance}
        onStartSetup={handleStartSetup}
        onBackToIntro={handleBackToIntro}
        infrastructureDatasetId={infrastructureDatasetId}
        onInfrastructureDatasetChange={setInfrastructureDatasetId}
        infrastructureComfortSelection={infrastructureComfortSelection}
        onInfrastructureComfortSelectionChange={setInfrastructureComfortSelection}
        contextKind={contextKind}
        onContextKindChange={handleContextKindChange}
        contextDatasetId={contextDatasetId}
        onContextDatasetChange={setContextDatasetId}
        selectedContextFields={selectedContextFields}
        onSelectedContextFieldsChange={setSelectedContextFields}
        contextFieldOptions={contextFieldOptions}
        contextFieldsLoading={contextFieldsLoading}
        contextFieldsError={contextFieldsError}
        demographicsIndicatorBlockGroupSupport={
          demographicsIndicatorBlockGroupSupport
        }
        onRunAnalysis={handleRunAnalysis}
        analysisRunning={analysisRunning}
        analysisProgress={analysisProgress}
        analysisError={analysisError}
        canRunAnalysis={canRunAnalysis}
        geographicFilter={geographicFilter}
        onGeographicLevelChange={handleGeographicLevelChange}
        onGeographicPlaceChange={handleGeographicPlaceChange}
        jurisdictionPlaces={jurisdictionPlaces}
        jurisdictionPlacesLoading={jurisdictionPlacesLoading}
        pinnedAnalysisCount={pinnedAnalyses.length}
        bikeComfortVisible={bikeComfortVisible}
        onToggleBikeComfortVisible={() =>
          setBikeComfortVisible((prev) => !prev)
        }
        contextLayerVisible={contextLayerVisible}
        onToggleContextLayerVisible={() =>
          setContextLayerVisible((prev) => !prev)
        }
        demographicsGeographyUnit={demographicsGeographyUnit}
        onDemographicsGeographyUnitChange={setDemographicsGeographyUnit}
        demographicsGeographySupport={demographicsGeographySupport}
      />

      <div id="infrastructure-equity-map-area" className="relative min-w-0 flex-1">
        <DataQueryMap onMapViewReady={setMapView} />
        <DataQueryMapWidgets
          mapView={mapView}
          onEquityAnalysisRemove={handleRemovePinnedAnalysis}
          hideLayerListVisibility
          hideEsriLegend={!bikeComfortVisible && !contextLayerVisible}
          showLegendPanel={
            Boolean(activeAnalysis) ||
            bikeComfortVisible ||
            contextLayerVisible ||
            pinnedAnalyses.length > 0 ||
            (phase === "setup" && setupStep === "geographic")
          }
          legendPanelTitle="Legend"
          customLegend={
            activeAnalysis ? (
              <EquityBivariateLegend
                contextLabel={activeAnalysis.result.contextFieldLabel}
                extentLabel={activeAnalysis.result.geographicLabel}
                runTitle={activeAnalysis.layerTitleMain}
              />
            ) : undefined
          }
        />
      </div>

      <InfrastructureEquityRightSidebar
        isCollapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((prev) => !prev)}
        analysis={activeAnalysis?.result ?? null}
        pinnedAnalyses={pinnedAnalyses}
        activeAnalysisId={activeAnalysisId}
        onSelectAnalysis={setActiveAnalysisId}
        analysisRunning={analysisRunning}
      />
    </div>
  );
}
