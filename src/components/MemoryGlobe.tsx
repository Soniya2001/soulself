import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Globe as GlobeIcon,
  Compass,
  MapPin,
  RotateCcw,
  Sparkles,
  Search,
  ZoomIn,
  ZoomOut,
  Plus,
  ChevronRight,
  X,
  Play,
  Pause,
  Navigation,
} from "lucide-react";
import { JournalEntry, JournalLocation } from "../types";
import { DEFAULT_CATEGORIES, POPULAR_LOCATIONS } from "../data/initialData";

interface MemoryGlobeProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntryWithLocation: (location: JournalLocation) => void;
}

interface LocationGroup {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
  entries: JournalEntry[];
}

export const MemoryGlobe: React.FC<MemoryGlobeProps> = ({
  entries,
  onSelectEntry,
  onNewEntryWithLocation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markerObjectsRef = useRef<{ mesh: THREE.Object3D; group: LocationGroup }[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // Interaction State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeLocation, setActiveLocation] = useState<LocationGroup | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [hoveredLocation, setHoveredLocation] = useState<LocationGroup | null>(null);

  // Group entries by location
  const locationGroups: LocationGroup[] = useMemo(() => {
    const map = new Map<string, LocationGroup>();

    entries.forEach((entry) => {
      if (
        entry.location &&
        typeof entry.location.latitude === "number" &&
        typeof entry.location.longitude === "number"
      ) {
        const key = `${entry.location.name.toLowerCase()}-${entry.location.latitude.toFixed(2)}`;
        if (!map.has(key)) {
          map.set(key, {
            name: entry.location.name,
            country: entry.location.country,
            latitude: entry.location.latitude,
            longitude: entry.location.longitude,
            entries: [],
          });
        }
        map.get(key)!.entries.push(entry);
      }
    });

    return Array.from(map.values());
  }, [entries]);

  // Filter location groups based on category & search
  const filteredLocationGroups = useMemo(() => {
    return locationGroups
      .map((loc) => {
        const matchingEntries = loc.entries.filter((entry) => {
          const matchCategory =
            selectedCategory === "ALL" ||
            (entry.categories && entry.categories.includes(selectedCategory));

          const matchSearch =
            !searchQuery ||
            loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (loc.country && loc.country.toLowerCase().includes(searchQuery.toLowerCase())) ||
            entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.content.toLowerCase().includes(searchQuery.toLowerCase());

          return matchCategory && matchSearch;
        });

        return {
          ...loc,
          entries: matchingEntries,
        };
      })
      .filter((loc) => loc.entries.length > 0);
  }, [locationGroups, selectedCategory, searchQuery]);

  // Helper: Convert Lat/Lng to 3D Cartesian coordinates on sphere
  const latLngToVector3 = (lat: number, lng: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  // Three.js initialization and render loop
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 580;

    // Scene with clean white background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 30, 230);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 0.6;
    controls.enablePan = false;
    controls.minDistance = 110;
    controls.maxDistance = 450;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 1.0;
    controlsRef.current = controls;

    // Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    const sphereRadius = 75;

    // Load High-Resolution NASA Textures
    const textureLoader = new THREE.TextureLoader();

    // 1. Photorealistic Earth Surface (Blue Marble)
    const earthMap = textureLoader.load("/textures/earth_atmos_2048.jpg", () => {
      renderer.render(scene, camera);
    });
    earthMap.colorSpace = THREE.SRGBColorSpace;

    const earthSpecularMap = textureLoader.load("/textures/earth_specular_2048.jpg");

    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      map: earthMap,
      specularMap: earthSpecularMap,
      specular: new THREE.Color(0x38bdf8),
      shininess: 24,
      bumpScale: 0.05,
    });
    const baseSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(baseSphere);

    // 2. Realistic Dynamic Cloud Layer (Independently rotating weather systems)
    const cloudsMap = textureLoader.load("/textures/earth_clouds_1024.png");
    const cloudsGeometry = new THREE.SphereGeometry(sphereRadius + 0.85, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    cloudsMesh.name = "cloudsMesh";
    globeGroup.add(cloudsMesh);

    // 3. Atmospheric Rayleigh Scattering Glow (Soft Azure halo limb)
    const innerAtmoGeometry = new THREE.SphereGeometry(sphereRadius + 1.2, 64, 64);
    const innerAtmoMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      blending: THREE.NormalBlending,
    });
    const innerAtmoMesh = new THREE.Mesh(innerAtmoGeometry, innerAtmoMaterial);
    globeGroup.add(innerAtmoMesh);

    const glowGeometry = new THREE.SphereGeometry(sphereRadius * 1.08, 48, 48);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    globeGroup.add(glowSphere);

    // 4. Subtle Coordinate Grid Lines (Soft azure latitude & longitude rings)
    const gridLinesGroup = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.18,
    });

    for (let lat = -60; lat <= 60; lat += 30) {
      const radiusAtLat = (sphereRadius + 1.2) * Math.cos((lat * Math.PI) / 180);
      const y = (sphereRadius + 1.2) * Math.sin((lat * Math.PI) / 180);
      const circleGeometry = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radiusAtLat, y, Math.sin(theta) * radiusAtLat));
      }
      circleGeometry.setFromPoints(points);
      const line = new THREE.Line(circleGeometry, lineMaterial);
      gridLinesGroup.add(line);
    }

    for (let lng = 0; lng < 360; lng += 45) {
      const circleGeometry = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const phi = (i / 64) * Math.PI * 2;
        const x = (sphereRadius + 1.2) * Math.sin(phi) * Math.cos((lng * Math.PI) / 180);
        const y = (sphereRadius + 1.2) * Math.cos(phi);
        const z = (sphereRadius + 1.2) * Math.sin(phi) * Math.sin((lng * Math.PI) / 180);
        points.push(new THREE.Vector3(x, y, z));
      }
      circleGeometry.setFromPoints(points);
      const line = new THREE.Line(circleGeometry, lineMaterial);
      gridLinesGroup.add(line);
    }
    globeGroup.add(gridLinesGroup);

    // 5. Photorealistic Balanced Lighting for Clean White Background
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(200, 120, 160);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.0);
    fillLight.position.set(-180, -60, -100);
    scene.add(fillLight);

    // Raycasting for marker hovering & clicking
    const onPointerMove = (e: PointerEvent) => {
      if (!cameraRef.current || !sceneRef.current) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / container.clientWidth) * 2 - 1,
        -((e.clientY - rect.top) / container.clientHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const meshes = markerObjectsRef.current.map((m) => m.mesh);
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = markerObjectsRef.current.find(
          (m) => m.mesh === intersects[0].object || m.mesh.children.includes(intersects[0].object)
        );
        if (hit) {
          setHoveredLocation(hit.group);
          container.style.cursor = "pointer";
        }
      } else {
        setHoveredLocation(null);
        container.style.cursor = "grab";
      }
    };

    const onPointerDown = () => {
      container.style.cursor = "grabbing";
    };

    const onPointerUp = (e: MouseEvent) => {
      container.style.cursor = "grab";
      if (!cameraRef.current || !sceneRef.current) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / container.clientWidth) * 2 - 1,
        -((e.clientY - rect.top) / container.clientHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const meshes = markerObjectsRef.current.map((m) => m.mesh);
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = markerObjectsRef.current.find(
          (m) => m.mesh === intersects[0].object || m.mesh.children.includes(intersects[0].object)
        );
        if (hit) {
          focusOnLocation(hit.group);
        }
      }
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointerup", onPointerUp);

    // Responsive Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 580;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // Animation Loop
    let time = 0;
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      time += 0.015;

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Dynamic independent cloud circulation
      if (globeGroupRef.current) {
        const clouds = globeGroupRef.current.getObjectByName("cloudsMesh");
        if (clouds) {
          clouds.rotation.y += 0.00035;
        }
      }

      // Animate pulsing glow on markers
      markerObjectsRef.current.forEach(({ mesh }) => {
        const ring = mesh.getObjectByName("glowRing");
        if (ring) {
          const scale = 1.0 + 0.35 * Math.sin(time * 3);
          ring.scale.set(scale, scale, scale);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update OrbitControls autoRotate state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating]);

  // Update 3D Memory Markers when filtered location groups change
  useEffect(() => {
    if (!globeGroupRef.current) return;
    const globeGroup = globeGroupRef.current;

    // Remove old markers
    markerObjectsRef.current.forEach(({ mesh }) => {
      globeGroup.remove(mesh);
    });
    markerObjectsRef.current = [];

    const sphereRadius = 75;

    filteredLocationGroups.forEach((group) => {
      const position = latLngToVector3(group.latitude, group.longitude, sphereRadius + 1.2);

      const markerContainer = new THREE.Group();
      markerContainer.position.copy(position);

      // Align marker with sphere normal
      markerContainer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().normalize());

      // 1. Core Pin Sphere
      const pinGeometry = new THREE.SphereGeometry(2.0, 16, 16);
      const isSelected = activeLocation?.name === group.name;
      const pinMaterial = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xec4899 : 0xdb2777,
      });
      const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
      pinMesh.position.y = 1.5;
      markerContainer.add(pinMesh);

      // 2. Animated Pulsing Glow Ring on Surface
      const ringGeometry = new THREE.RingGeometry(1.5, 3.8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xf472b6 : 0xfbcfe8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.name = "glowRing";
      ringMesh.rotation.x = Math.PI / 2;
      markerContainer.add(ringMesh);

      // 3. Stalk connecting beacon to Earth's surface
      const stalkGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2.5, 8);
      const stalkMaterial = new THREE.MeshBasicMaterial({
        color: 0x9d174d,
        transparent: true,
        opacity: 0.8,
      });
      const stalkMesh = new THREE.Mesh(stalkGeometry, stalkMaterial);
      stalkMesh.position.y = 1.25;
      markerContainer.add(stalkMesh);

      globeGroup.add(markerContainer);
      markerObjectsRef.current.push({ mesh: markerContainer, group });
    });
  }, [filteredLocationGroups, activeLocation]);

  // Focus and zoom camera to a specific location
  const focusOnLocation = (loc: LocationGroup) => {
    setActiveLocation(loc);
    setIsAutoRotating(false);

    if (cameraRef.current && controlsRef.current && globeGroupRef.current) {
      const phi = (90 - loc.latitude) * (Math.PI / 180);
      const theta = (loc.longitude + 180) * (Math.PI / 180);
      const targetRadius = 150;

      const targetX = -(targetRadius * Math.sin(phi) * Math.cos(theta));
      const targetZ = targetRadius * Math.sin(phi) * Math.sin(theta);
      const targetY = targetRadius * Math.cos(phi);

      const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
      const startPos = cameraRef.current.position.clone();

      let progress = 0;
      const animateCamera = () => {
        progress += 0.04;
        cameraRef.current?.position.lerpVectors(startPos, targetPos, Math.min(progress, 1));
        controlsRef.current?.target.set(0, 0, 0);
        controlsRef.current?.update();

        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        }
      };
      animateCamera();
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    if (!cameraRef.current || !controlsRef.current) return;
    const factor = direction === "in" ? 0.8 : 1.25;
    cameraRef.current.position.multiplyScalar(factor);
    controlsRef.current.update();
  };

  const handleReset = () => {
    setActiveLocation(null);
    setIsAutoRotating(true);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 30, 230);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-purple-950 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-pink-200/60">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Memory Globe
            </h2>
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
          </div>
          <p className="text-sm text-purple-900/70 font-serif">
            Explore your memories geographically on an interactive 3D Earth globe.
          </p>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[190px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations, memories..."
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-white border border-pink-200 text-xs text-purple-950 placeholder:text-purple-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-pink-200 shadow-xs">
            {["ALL", "Travel", "Work", "Personal", "Family"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-purple-950 text-white shadow-xs"
                    : "text-purple-900/60 hover:text-purple-950"
                }`}
              >
                {cat === "ALL" ? "All Locations" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Card with Pristine White Background */}
      <div className="relative rounded-[36px] bg-white border border-pink-200/80 shadow-xl overflow-hidden min-h-[560px] flex flex-col md:flex-row">
        {/* Soft Radial Ambient Glow behind the Globe */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_45%_50%,rgba(240,249,255,0.8)_0%,rgba(255,245,250,0.5)_50%,rgba(255,255,255,1)_100%)]" />

        {/* Left / Main 3D Interactive Canvas */}
        <div className="relative flex-1 min-h-[480px] md:min-h-[580px]">
          {/* Canvas container */}
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Floating HUD Controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            <div className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-pink-200/80 text-[11px] font-semibold text-purple-950 flex items-center gap-2 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-pink-500" />
              <span>
                {filteredLocationGroups.length} Location{filteredLocationGroups.length === 1 ? "" : "s"} on Earth
              </span>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20 bg-white/90 backdrop-blur-md p-1 rounded-full border border-pink-200/80 shadow-xs">
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              title={isAutoRotating ? "Pause auto-rotation" : "Resume auto-rotation"}
              className={`p-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isAutoRotating ? "bg-pink-500 text-white shadow-xs" : "text-purple-700 hover:bg-pink-50"
              }`}
            >
              {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleZoom("in")}
              title="Zoom in"
              className="p-2 rounded-full text-purple-700 hover:bg-pink-50 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom("out")}
              title="Zoom out"
              className="p-2 rounded-full text-purple-700 hover:bg-pink-50 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReset}
              title="Reset view"
              className="p-2 rounded-full text-purple-700 hover:bg-pink-50 transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hover tooltip */}
          {hoveredLocation && !activeLocation && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
              <div className="px-4 py-2 rounded-2xl bg-purple-950/90 backdrop-blur-md text-white text-xs font-serif shadow-xl flex items-center gap-2 border border-pink-300/30">
                <MapPin className="w-3.5 h-3.5 text-pink-400" />
                <span className="font-bold">{hoveredLocation.name}</span>
                {hoveredLocation.country && <span className="opacity-75 text-pink-200">({hoveredLocation.country})</span>}
                <span className="bg-pink-500 text-white px-2 py-0.5 rounded-full text-[10px] font-sans font-bold">
                  {hoveredLocation.entries.length} {hoveredLocation.entries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
            </div>
          )}

          {/* Quick Location Selection Pills */}
          <div className="absolute bottom-4 left-4 right-4 z-20 overflow-x-auto pb-1 flex items-center gap-2 scrollbar-none">
            {filteredLocationGroups.map((loc) => (
              <button
                key={loc.name}
                onClick={() => focusOnLocation(loc)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  activeLocation?.name === loc.name
                    ? "bg-purple-950 text-white ring-2 ring-pink-400 font-bold"
                    : "bg-white/95 text-purple-950 hover:bg-pink-50 border border-pink-200/80"
                }`}
              >
                <span>📍 {loc.name}</span>
                <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold">
                  {loc.entries.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side Drawer / Active Location Memory Sheet */}
        {activeLocation && (
          <div className="w-full md:w-96 bg-white/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-pink-200/80 p-6 flex flex-col justify-between max-h-[580px] overflow-y-auto animate-slide-in-right z-30">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-pink-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-purple-950 leading-tight">
                      {activeLocation.name}
                    </h3>
                    <p className="text-[11px] text-purple-900/60 font-serif">
                      {activeLocation.country || "Earth"} • {activeLocation.latitude.toFixed(2)}°,{" "}
                      {activeLocation.longitude.toFixed(2)}°
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveLocation(null)}
                  className="text-purple-400 hover:text-purple-900 p-1.5 rounded-full hover:bg-pink-50 text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Memory entries list for this city */}
              <div className="space-y-3 mb-6">
                <div className="text-[10px] uppercase font-bold tracking-widest text-pink-500">
                  Journals in {activeLocation.name} ({activeLocation.entries.length})
                </div>

                {activeLocation.entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="p-3 rounded-2xl bg-pink-50/50 hover:bg-pink-100/60 border border-pink-200/60 hover:border-pink-400/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px] text-purple-900/60 mb-1">
                      <span className="font-serif italic">{entry.date}</span>
                      <span>
                        {entry.moodEmoji} {entry.mood}
                      </span>
                    </div>

                    <h4 className="font-serif text-sm font-bold text-purple-950 group-hover:text-pink-600 transition-colors line-clamp-1">
                      {entry.title || "Untitled Memory"}
                    </h4>

                    {entry.media && entry.media.length > 0 && (
                      <div className="mt-2 rounded-xl overflow-hidden h-24 w-full bg-purple-100">
                        <img
                          src={entry.media[0].url}
                          alt={entry.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <p className="text-xs text-purple-900/80 line-clamp-2 mt-1.5 font-serif">{entry.content}</p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-pink-200/60 text-[10px] text-pink-600 font-bold">
                      <span>Open in Diary</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA: Write journal at this location */}
            <div className="pt-3 border-t border-pink-200/60">
              <button
                onClick={() => {
                  onNewEntryWithLocation({
                    name: activeLocation.name,
                    country: activeLocation.country,
                    latitude: activeLocation.latitude,
                    longitude: activeLocation.longitude,
                  });
                }}
                className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write Journal in {activeLocation.name}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Popular Locations Quick Picker */}
      <div className="p-6 rounded-[28px] bg-white border border-pink-200/70 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-pink-500" />
            <h3 className="font-serif font-bold text-base text-purple-950">
              Popular Global Destinations
            </h3>
          </div>
          <span className="text-xs text-purple-900/60 font-serif">
            Click to rotate Earth & locate
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {POPULAR_LOCATIONS.map((dest) => {
            const hasMemory = locationGroups.some(
              (g) => g.name.toLowerCase() === dest.name.toLowerCase()
            );

            return (
              <button
                key={dest.name}
                onClick={() => {
                  const existing = locationGroups.find(
                    (g) => g.name.toLowerCase() === dest.name.toLowerCase()
                  );
                  if (existing) {
                    focusOnLocation(existing);
                  } else {
                    focusOnLocation({
                      name: dest.name,
                      country: dest.country,
                      latitude: dest.latitude,
                      longitude: dest.longitude,
                      entries: [],
                    });
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer group ${
                  hasMemory
                    ? "bg-pink-50/70 border-pink-300/80 hover:bg-pink-100"
                    : "bg-white border-pink-100 hover:border-pink-300 hover:bg-pink-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">📍</span>
                  {hasMemory && (
                    <span className="w-2 h-2 rounded-full bg-pink-500 shadow-xs" />
                  )}
                </div>
                <div className="font-serif font-bold text-xs text-purple-950 group-hover:text-pink-600 mt-1 truncate">
                  {dest.name}
                </div>
                <div className="text-[10px] text-purple-900/60 truncate">
                  {dest.country}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
