
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Dot } from '../types';

interface DotGlobeProps {
  onDotClick: (lat: number, lng: number) => void;
  targetRotation?: [number, number];
}

const DotGlobe: React.FC<DotGlobeProps> = ({ onDotClick, targetRotation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const rotationRef = useRef<[number, number]>([0, -20]);
  const velocityRef = useRef<[number, number]>([0, 0]);
  const mousePosRef = useRef<[number, number] | null>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Physics Constants
  const FRICTION = 0.96; // Overall globe rotation friction
  const DOT_FRICTION = 0.92; // How fast dots lose flying speed
  const SPRING_STRENGTH = 0.015; // How slowly they return (lower = slower)
  const REPEL_RADIUS = 80;
  const REPEL_STRENGTH = 8; // Burst impulse strength

  useEffect(() => {
    const generateDots = async () => {
      try {
        const geoResponse = await fetch('https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson');
        const geoData = await geoResponse.json();
        
        const dotList: Dot[] = [];
        const step = 2.5; 
        
        for (let lat = -90; lat <= 90; lat += step) {
          for (let lng = -180; lng <= 180; lng += step) {
            const isLand = geoData.features.some((feature: any) => d3.geoContains(feature, [lng, lat]));
            if (isLand) {
              dotList.push({ 
                lat, 
                lng, 
                id: `${lat}-${lng}`,
                phaseX: Math.random() * Math.PI * 2,
                phaseY: Math.random() * Math.PI * 2,
                amplitude: 0.2 + Math.random() * 0.4,
                speed: 0.5 + Math.random() * 1.5,
                offX: 0,
                offY: 0,
                vx: 0,
                vy: 0
              });
            }
          }
        }
        setDots(dotList);
      } catch (error) {
        console.error("Error generating globe dots:", error);
      }
    };

    generateDots();
  }, []);

  useEffect(() => {
    if (targetRotation) {
      rotationRef.current = targetRotation;
      velocityRef.current = [0, 0];
    }
  }, [targetRotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const render = (time: number) => {
      const width = canvas.width;
      const height = canvas.height;
      const radius = Math.min(width, height) * 0.4;
      const t = time / 1000;

      // Draw dark space background
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, width, height);

      // Apply Globe Inertia
      if (!isDragging.current) {
        rotationRef.current[0] += velocityRef.current[0];
        rotationRef.current[1] += velocityRef.current[1];
        rotationRef.current[1] = Math.max(-90, Math.min(90, rotationRef.current[1]));
        velocityRef.current[0] *= FRICTION;
        velocityRef.current[1] *= FRICTION;
      }

      const projection = d3.geoOrthographic()
        .scale(radius)
        .translate([width / 2, height / 2])
        .rotate([-rotationRef.current[0], -rotationRef.current[1]]);

      // Subtle atmospheric glow
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(width/2, height/2, radius * 0.8, width/2, height/2, radius * 1.2);
      gradient.addColorStop(0, 'rgba(10, 40, 100, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.arc(width/2, height/2, radius * 1.5, 0, 2 * Math.PI);
      ctx.fill();

      // Physics and Projection
      const sortedDots = dots.map(dot => {
        const floatLat = dot.lat + Math.sin(t * dot.speed + dot.phaseX) * dot.amplitude;
        const floatLng = dot.lng + Math.cos(t * dot.speed + dot.phaseY) * dot.amplitude;
        const geoDist = d3.geoDistance([floatLng, floatLat], [-rotationRef.current[0], -rotationRef.current[1]]);
        const coords = projection([floatLng, floatLat]);
        const isFront = geoDist < Math.PI / 2;
        
        if (coords) {
          // 1. Mouse Interaction (Impulse) - LIMITED TO FRONT SIDE ONLY
          if (mousePosRef.current && isFront) {
            const dx = (coords[0] + dot.offX) - mousePosRef.current[0];
            const dy = (coords[1] + dot.offY) - mousePosRef.current[1];
            const distSq = dx * dx + dy * dy;
            
            if (distSq < REPEL_RADIUS * REPEL_RADIUS) {
              const dist = Math.sqrt(distSq);
              const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
              // Add blast velocity
              dot.vx += (dx / dist) * force * REPEL_STRENGTH;
              dot.vy += (dy / dist) * force * REPEL_STRENGTH;
            }
          }

          // 2. Spring & Friction Physics (Continuous even if they move to the back)
          // Pull back to 0,0
          const ax = -dot.offX * SPRING_STRENGTH;
          const ay = -dot.offY * SPRING_STRENGTH;
          
          dot.vx += ax;
          dot.vy += ay;
          dot.vx *= DOT_FRICTION;
          dot.vy *= DOT_FRICTION;
          
          dot.offX += dot.vx;
          dot.offY += dot.vy;
        }

        return { dot, coords, geoDist, isFront };
      }).sort((a, b) => b.geoDist - a.geoDist);

      // Rendering
      sortedDots.forEach(({ dot, coords, geoDist, isFront }) => {
        if (!coords) return;

        const x = coords[0] + dot.offX;
        const y = coords[1] + dot.offY;
        
        // Visuals based on depth and speed
        const speed = Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy);
        const distFromHome = Math.sqrt(dot.offX * dot.offX + dot.offY * dot.offY);
        const excitement = Math.min(1, speed * 0.2 + distFromHome * 0.01);

        let opacity, size;
        if (isFront) {
          opacity = 0.3 + (1 - (geoDist / (Math.PI / 2))) * 0.7;
          size = 1.6 + (1 - (geoDist / (Math.PI / 2))) * 1.2;
        } else {
          const backFactor = (geoDist - Math.PI / 2) / (Math.PI / 2);
          opacity = 0.25 * (1 - backFactor * 0.7);
          size = 1.6 * (1 - backFactor * 0.5);
        }

        // Boost visuals slightly when flying, but keep glow low
        opacity = Math.min(1, opacity + excitement * 0.3);
        size *= (1 + excitement * 0.5);

        // Render Outer Glow - REDUCED INTENSITY AND RADIUS
        if (isFront || excitement > 0.2) {
          ctx.beginPath();
          // Lowered alpha and tighter glow radius for scattered dots
          const glowAlpha = (isFront ? opacity : opacity * 0.4) * (0.08 + excitement * 0.15);
          ctx.fillStyle = `rgba(0, 160, 255, ${glowAlpha})`;
          ctx.arc(x, y, size * (1.3 + excitement * 0.8), 0, 2 * Math.PI);
          ctx.fill();
        }

        // Render Core
        ctx.beginPath();
        // Shift colors slightly towards white when excited but keep them grounded
        const r = Math.min(255, 180 + excitement * 50);
        const g = Math.min(255, 230 + excitement * 25);
        const b = 255;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fill();

        // Render Center Highlight
        if ((isFront && opacity > 0.6) || excitement > 0.5) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * (0.5 + excitement * 0.3)})`;
          ctx.arc(x, y, size * 0.4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dots]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = [0, 0];
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mousePosRef.current = [e.clientX - rect.left, e.clientY - rect.top];
    }

    if (!isDragging.current) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    rotationRef.current[0] += dx * 0.3;
    rotationRef.current[1] = Math.max(-90, Math.min(90, rotationRef.current[1] - dy * 0.3));
    velocityRef.current = [dx * 0.3, -dy * 0.3];
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    mousePosRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - lastMousePos.current.x);
    const dy = Math.abs(e.clientY - lastMousePos.current.y);
    if (dx > 5 || dy > 5) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const radius = Math.min(width, height) * 0.4;

    const projection = d3.geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .rotate([-rotationRef.current[0], -rotationRef.current[1]]);

    const inverted = projection.invert!([x, y]);
    if (inverted) {
      onDotClick(inverted[1], inverted[0]);
    }
  };

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="cursor-grab active:cursor-grabbing w-full h-full"
    />
  );
};

export default DotGlobe;
