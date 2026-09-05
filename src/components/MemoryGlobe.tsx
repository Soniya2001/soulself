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
  Play,
  Pause,
} from "lucide-react";
import { JournalEntry, JournalLocation } from "../types";
import { DEFAULT_CATEGORIES } from "../data/initialData";
import { MemoryCarousel, LocationGroup } from "./MemoryCarousel";
import {
  latitudeLongitudeToGlobePosition,
  runGeographicCoordinateUnitTests,
  resolveLocationFromName,
} from "../utils/location";

interface MemoryGlobeProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntryWithLocation: (location: JournalLocation) => void;
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
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const markerObjectsRef = useRef<{ mesh: THREE.Object3D; group: LocationGroup }[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // Interaction State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeLocation, setActiveLocation] = useState<LocationGroup | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [hoveredLocation, setHoveredLocation] = useState<LocationGroup | null>(null);

  // Requirement 20: Run mathematical unit test suite on component mount
  useEffect(() => {
    runGeographicCoordinateUnitTests();
  }, []);

  // Requirements 6, 14, 15, 16, 17: Extract location groups dynamically from user's journal entries
  const locationGroups: LocationGroup[] = useMemo(() => {
    const map = new Map<string, LocationGroup>();

    entries.forEach((entry) => {
      if (entry.location && entry.location.name && entry.location.name.trim().length > 0) {
        const rawName = entry.location.name.trim();

        let lat = typeof entry.location.latitude === "number" ? entry.location.latitude : undefined;
        let lng = typeof entry.location.longitude === "number" ? entry.location.longitude : undefined;
        let country = entry.location.country || "Earth";

        if (typeof lat !== "number" || typeof lng !== "number" || (lat === 0 && lng === 0)) {
          const resolved = resolveLocationFromName(rawName, country);
          lat = resolved.latitude;
          lng = resolved.longitude;
          country = resolved.country || country;
        }

        if (
          typeof lat === "number" &&
          typeof lng === "number" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        ) {
          const mapKey = `${rawName.toLowerCase()}-${lat.toFixed(3)},${lng.toFixed(3)}`;
          if (!map.has(mapKey)) {
            map.set(mapKey, {
              name: rawName,
              country,
              latitude: lat,
              longitude: lng,
              entries: [],
            });
          }
          map.get(mapKey)!.entries.push(entry);
        }
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

  // Three.js initialization and render loop
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // Scene with clean white background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 30, 230);
    cameraRef.current = camera;

    // Renderer with enhanced exposure for bright, crisp Earth details
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.65;
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

    // Requirement 7: Globe Group (Parent of Earth AND Markers so both rotate together!)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const sphereRadius = 75;

    // Load High-Resolution NASA Textures
    const textureLoader = new THREE.TextureLoader();

    // 1. Photorealistic Earth Surface (Blue Marble)
    const earthMap = textureLoader.load("/textures/earth_atmos_2048.jpg", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    });

    const earthSpecularMap = textureLoader.load("/textures/earth_specular_2048.jpg");

    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      map: earthMap,
      specularMap: earthSpecularMap,
      specular: new THREE.Color(0x7dd3fc),
      shininess: 14,
      bumpScale: 0.05,
    });
    const baseSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(baseSphere);

    // 2. Realistic Dynamic Cloud Layer
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

    // 3. Atmospheric Glow
    const innerAtmoGeometry = new THREE.SphereGeometry(sphereRadius + 1.2, 64, 64);
    const innerAtmoMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      blending: THREE.NormalBlending,
    });
    const innerAtmoMesh = new THREE.Mesh(innerAtmoGeometry, innerAtmoMaterial);
    globeGroup.add(innerAtmoMesh);

    const glowGeometry = new THREE.SphereGeometry(sphereRadius * 1.08, 48, 48);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    globeGroup.add(glowSphere);

    // 4. Photorealistic Balanced Bright Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 1.6);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.6);
    sunLight.position.set(220, 140, 180);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    fillLight.position.set(-200, -80, -120);
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
      const h = containerRef.current.clientHeight || 560;
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

  // Requirements 4, 6, 7, 12, 13, 14: Update 3D Memory Markers using generic projection
  useEffect(() => {
    if (!markersGroupRef.current) return;
    const markersGroup = markersGroupRef.current;

    // Remove old markers
    markerObjectsRef.current.forEach(({ mesh }) => {
      markersGroup.remove(mesh);
    });
    markerObjectsRef.current = [];

    const sphereRadius = 75;

    filteredLocationGroups.forEach((group) => {
      // Single Source of Truth conversion from lat/lon to 3D Globe position
      const position = latitudeLongitudeToGlobePosition(
        group.latitude,
        group.longitude,
        sphereRadius * 1.015
      );

      const markerContainer = new THREE.Group();
      markerContainer.position.copy(position);

      // Align marker normal with globe surface
      markerContainer.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        position.clone().normalize()
      );

      // 1. Core Pin Sphere
      const isSelected = activeLocation?.name === group.name;
      const pinGeometry = new THREE.SphereGeometry(2.2, 16, 16);
      const pinMaterial = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xec4899 : 0xdb2777,
      });
      const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
      pinMesh.position.y = 1.6;
      markerContainer.add(pinMesh);

      // 2. Animated Pulsing Glow Ring on Surface
      const ringGeometry = new THREE.RingGeometry(1.5, 3.8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xf472b6 : 0xfbcfe8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.name = "glowRing";
      ringMesh.rotation.x = Math.PI / 2;
      markerContainer.add(ringMesh);

      // 3. Beacon Stalk connecting to Earth's surface
      const stalkGeometry = new THREE.CylinderGeometry(0.35, 0.35, 2.5, 8);
      const stalkMaterial = new THREE.MeshBasicMaterial({
        color: 0x9d174d,
        transparent: true,
        opacity: 0.8,
      });
      const stalkMesh = new THREE.Mesh(stalkGeometry, stalkMaterial);
      stalkMesh.position.y = 1.25;
      markerContainer.add(stalkMesh);

      markersGroup.add(markerContainer);
      markerObjectsRef.current.push({ mesh: markerContainer, group });
    });
  }, [filteredLocationGroups, activeLocation]);

  // Focus and zoom camera to a specific location
  const focusOnLocation = (loc: LocationGroup) => {
    setActiveLocation(loc);
    setIsAutoRotating(false);

    if (cameraRef.current && controlsRef.current) {
      const targetRadius = 210;
      const targetPos = latitudeLongitudeToGlobePosition(
        loc.latitude,
        loc.longitude,
        targetRadius
      );

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

  const currentDisplayLocation = activeLocation || hoveredLocation;

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Globe Controls & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 p-4 sm:p-6 rounded-3xl border border-pink-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-purple-950">
              EXPLORE MEMORIES
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-purple-950">
            Interactive 3D Memory Globe
          </h2>
          <p className="text-xs sm:text-sm text-[#7E6584] font-serif">
            Watch your journal memories pop up across Earth as the globe rotates.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-pink-600 text-white shadow-2xs"
                : "bg-pink-50 text-purple-900 hover:bg-pink-100"
            }`}
          >
            All Places ({locationGroups.length})
          </button>
          {DEFAULT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                selectedCategory === cat.name
                  ? "bg-pink-600 text-white shadow-2xs"
                  : "bg-pink-50/80 text-purple-900 hover:bg-pink-100"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Globe Stage */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-white border border-pink-100/90 shadow-lg min-h-[520px] sm:min-h-[580px] flex items-center justify-center">
        {/* Three.js Container */}
        <div ref={containerRef} className="w-full h-[520px] sm:h-[580px] cursor-grab" />

        {/* Top Floating Telemetry Badge */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-pink-200/80 text-xs font-semibold text-purple-950 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-pink-500" />
            <span>{filteredLocationGroups.length} Locations on Earth</span>
          </div>
        </div>

        {/* Floating Globe Action Controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-full border border-pink-200/80 shadow-sm">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              isAutoRotating ? "bg-pink-100 text-pink-700 font-bold" : "text-purple-900 hover:bg-pink-50"
            }`}
            title={isAutoRotating ? "Pause Earth Rotation" : "Auto-Rotate Earth"}
          >
            {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleZoom("in")}
            className="p-2 rounded-full text-purple-900 hover:bg-pink-50 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom("out")}
            className="p-2 rounded-full text-purple-900 hover:bg-pink-50 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-full text-purple-900 hover:bg-pink-50 transition-all cursor-pointer"
            title="Reset Globe Camera"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Hover/Selected Location Chip */}
        {currentDisplayLocation && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-5 py-2.5 rounded-full shadow-xl border border-pink-300/40 text-xs font-serif flex items-center gap-2 animate-slide-up">
            <MapPin className="w-4 h-4 text-pink-200" />
            <span className="font-bold">{currentDisplayLocation.name}</span>
            <span className="text-pink-100">({currentDisplayLocation.entries.length} memories)</span>
          </div>
        )}

        {/* Requirement 19: Developer Diagnostic Overlay */}
        {(activeLocation || hoveredLocation) && (
          <div className="absolute bottom-4 left-4 z-40 bg-pink-950/90 text-white p-3 rounded-2xl text-xs font-mono backdrop-blur-md border border-pink-300/40 shadow-xl space-y-1 hidden md:block">
            <div className="font-bold text-pink-300 flex items-center gap-1.5 font-serif">
              <MapPin className="w-3.5 h-3.5 text-pink-400" />
              <span>{(activeLocation || hoveredLocation)?.name}</span>
            </div>
            <div className="text-[11px] text-gray-300">
              Lat: {(activeLocation || hoveredLocation)?.latitude.toFixed(4)}° | Lon: {(activeLocation || hoveredLocation)?.longitude.toFixed(4)}°
            </div>
            <div className="text-[10px] text-pink-200/80">
              3D Vector: ({latitudeLongitudeToGlobePosition((activeLocation || hoveredLocation)!.latitude, (activeLocation || hoveredLocation)!.longitude, 75).x.toFixed(1)}, {latitudeLongitudeToGlobePosition((activeLocation || hoveredLocation)!.latitude, (activeLocation || hoveredLocation)!.longitude, 75).y.toFixed(1)}, {latitudeLongitudeToGlobePosition((activeLocation || hoveredLocation)!.latitude, (activeLocation || hoveredLocation)!.longitude, 75).z.toFixed(1)})
            </div>
          </div>
        )}
      </div>

      {/* Center-Focused Memory Stack Carousel underneath the Globe */}
      <MemoryCarousel
        location={activeLocation}
        entries={activeLocation ? activeLocation.entries : []}
        onSelectEntry={onSelectEntry}
        onNewEntryWithLocation={onNewEntryWithLocation}
      />
    </div>
  );
};
