import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaceBoundingBox, Dent, Spider, Needle, Bruise, Swelling, SlapAnimation, Smoke, Phlegm, ShoeAnimation, Burn, FlameParticle } from './types';
import { detectFace, applyGenerativeImageEffect } from './services/geminiService';
import { auth, onAuthStateChanged, setAnalyticsUser, logLogin, logToolUse, logout } from './services/firebaseService';
import { 
    MalletIcon, SpinnerIcon, UploadIcon, CameraIcon, CoinIcon, HandIcon, VoodooNeedleIcon, SpiderIcon, BlisterIcon, PhlegmIcon, TornadoIcon, RestartIcon, BroomIcon, BurnerGunIcon, ClassicPunchIcon, DownloadIcon, UserIcon, LogoutIcon
} from './components/icons';
import { useLocalization } from './context/LocalizationContext';
import LanguageSelector from './components/LanguageSelector';
import AuthModal from './components/AuthModal';

const AnimatedMalletCursor: React.FC<{ position: { x: number, y: number } | null, visible: boolean }> = ({ position, visible }) => {
  if (!visible || !position) return null;
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: position.x, top: position.y, transform: 'translate(-10px, -30px)' }}
    >
      <MalletIcon
        className="w-10 h-10 text-yellow-400 drop-shadow-lg"
        style={{ animation: 'wobble 0.5s ease-in-out infinite' }}
      />
    </div>
  );
};

const BurnCursor: React.FC<{ position: { x: number, y: number } | null, visible: boolean }> = ({ position, visible }) => {
  if (!visible || !position) return null;
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: position.x, top: position.y, transform: 'translate(-16px, -16px)' }}
    >
      <BurnerGunIcon
        className="w-10 h-10 text-slate-100 drop-shadow-lg"
        style={{ transform: 'rotate(-45deg)' }}
      />
    </div>
  );
};

type ToolId = 'hand' | 'mallet' | 'fistPunch' | 'voodooSpider' | 'voodooNeedle' | 'burn' | 'classic' | 'phlegm' | 'tornado';

const App: React.FC = () => {
  const { t } = useLocalization();

  const tools = useMemo(() => [
      { id: 'hand', name: t('tools.hand'), icon: HandIcon },
      { id: 'mallet', name: t('tools.mallet'), icon: MalletIcon },
      { id: 'fistPunch', name: t('tools.blister'), icon: BlisterIcon },
      { id: 'voodooSpider', name: t('tools.spider'), icon: SpiderIcon },
      { id: 'voodooNeedle', name: t('tools.needle'), icon: VoodooNeedleIcon },
      { id: 'burn', name: t('tools.burn'), icon: BurnerGunIcon },
      { id: 'classic', name: t('tools.classic'), icon: ClassicPunchIcon },
      { id: 'phlegm', name: t('tools.phlegm'), icon: PhlegmIcon },
      { id: 'tornado', name: t('tools.tornado'), icon: TornadoIcon },
  ], [t]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [faceBox, setFaceBox] = useState<FaceBoundingBox | null>(null);
  const [dents, setDents] = useState<Dent[]>([]);
  const [spiders, setSpiders] = useState<Spider[]>([]);
  const [needles, setNeedles] = useState<Needle[]>([]);
  const [bruises, setBruises] = useState<Bruise[]>([]);
  const [swellings, setSwellings] = useState<Swelling[]>([]);
  const [slapAnimations, setSlapAnimations] = useState<SlapAnimation[]>([]);
  const [burns, setBurns] = useState<Burn[]>([]);
  const [smoke, setSmoke] = useState<Smoke[]>([]);
  const [phlegms, setPhlegms] = useState<Phlegm[]>([]);
  const [shoeAnimations, setShoeAnimations] = useState<ShoeAnimation[]>([]);
  const [flameParticles, setFlameParticles] = useState<FlameParticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [isHoveringFace, setIsHoveringFace] = useState<boolean>(false);

  const [credits, setCredits] = useState<number>(20);
  const [user, setUser] = useState<{ name: string; uid: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [hitCount, setHitCount] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<ToolId>('mallet');
  const [strength, setStrength] = useState<number>(50);
  const [hasDestructiveChanges, setHasDestructiveChanges] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const renderInfo = useRef({ offsetX: 0, offsetY: 0, finalWidth: 1, finalHeight: 1 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTornadoSoundTime = useRef(0);
  const burnSoundSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const classicAudioRef = useRef<HTMLAudioElement | null>(null);
  const burnIntervalRef = useRef<number | null>(null);
  const activeBurnIdRef = useRef<number | null>(null);
  const lastBurnPositionRef = useRef<{ x: number, y: number } | null>(null);
  const currentMousePosRef = useRef<{ x: number, y: number, absoluteX: number, absoluteY: number } | null>(null);
  
  const nonDestructiveEffectsBackup = useRef<{dents: Dent[], spiders: Spider[], needles: Needle[], bruises: Bruise[], swellings: Swelling[]}>({ dents: [], spiders: [], needles: [], bruises: [], swellings: [] });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setIsLoading(true);
        if (firebaseUser) {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            let userData = users[firebaseUser.uid];

            // Centralized logic to handle user data on login/signup.
            // This prevents race conditions and ensures the demo account is always handled correctly.
            if (!userData) {
                // Case 1: Brand new user.
                const isDemoUser = firebaseUser.email === 'sengwee.lim@gmail.com';
                userData = { 
                    name: firebaseUser.displayName, 
                    credits: isDemoUser ? 1000 : 100 
                };
            } else {
                // Case 2: Existing user.
                if (firebaseUser.email === 'sengwee.lim@gmail.com') {
                    // Reset credits to 1000 for the demo user on every login.
                    userData.credits = 1000;
                }
                // Always update the display name in case it changed (e.g., in Google account).
                userData.name = firebaseUser.displayName || userData.name;
            }

            // Save the definitive user data back to localStorage.
            users[firebaseUser.uid] = userData;
            localStorage.setItem('users', JSON.stringify(users));
            
            setUser({ 
                name: userData.name || 'User', 
                uid: firebaseUser.uid 
            });
            
            setCredits(userData.credits);
            setAnalyticsUser(firebaseUser.uid);
            logLogin(firebaseUser.providerData[0]?.providerId || 'password');

        } else {
            // User is signed out.
            setUser(null);
            setCredits(20); // Reset to guest credits
            setAnalyticsUser(null);
        }
        setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  useEffect(() => {
    // Persist credits to localStorage for logged-in users
    if (user) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users[user.uid]) {
                users[user.uid].credits = credits;
                localStorage.setItem('users', JSON.stringify(users));
            }
        } catch (e) {
            console.error("Failed to update credits in localStorage", e);
        }
    }
  }, [credits, user]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const handleLogout = useCallback(async () => {
    try {
        await logout();
        // The onAuthStateChanged listener will handle resetting the state
    } catch (error) {
        console.error("Logout failed:", error);
        setError("Logout failed. Please try again.");
    }
  }, []);

  const drawSpider = (ctx: CanvasRenderingContext2D, size: number) => {
      ctx.fillStyle = '#1a1a1a';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = size * 0.1;

      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.7, size, Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, size * 0.8, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      const leg = (s: number, flip = false) => {
          const m = flip ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(0, s * 0.2);
          ctx.lineTo(m * s * 1.5, s * 0.5);
          ctx.lineTo(m * s * 2, -s * 0.5);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(0, -s*0.1);
          ctx.lineTo(m * s * 1.8, -s*0.3);
          ctx.lineTo(m * s * 2.2, -s*1.2);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(0, s * 0.5);
          ctx.lineTo(m * s * 1.2, s * 1.2);
          ctx.lineTo(m * s * 1.8, s * 1.8);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, -s*0.4);
          ctx.lineTo(m * s * 1.0, -s * 1.5);
          ctx.lineTo(m * s * 1.5, -s * 2.2);
          ctx.stroke();
      };
      leg(size);
      leg(size, true);
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = imageRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;

    const sourceToDraw = offscreenCanvas || image;
    if (!ctx || !canvas || !sourceToDraw || (sourceToDraw === image && (!image.complete || image.naturalWidth === 0))) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const canvasRatio = canvas.width / canvas.height;
    const sourceWidth = (sourceToDraw instanceof HTMLImageElement) ? sourceToDraw.naturalWidth : sourceToDraw.width;
    const sourceHeight = (sourceToDraw instanceof HTMLImageElement) ? sourceToDraw.naturalHeight : sourceToDraw.height;
    const imageRatio = sourceWidth / sourceHeight;


    let finalWidth, finalHeight, offsetX, offsetY;

    // This logic implements "cover" scaling. It scales the image to fill the
    // entire canvas, cropping parts of the image if necessary, and centers it.
    if (canvasRatio > imageRatio) {
        // Canvas is wider than the image. Scale to match canvas width.
        // The image will be taller than the canvas and centered vertically.
        finalWidth = canvas.width;
        finalHeight = finalWidth / imageRatio;
        offsetX = 0;
        offsetY = (canvas.height - finalHeight) / 2;
    } else {
        // Canvas is taller than the image. Scale to match canvas height.
        // The image will be wider than the canvas and centered horizontally.
        finalHeight = canvas.height;
        finalWidth = finalHeight * imageRatio;
        offsetX = (canvas.width - finalWidth) / 2;
        offsetY = 0;
    }
    
    renderInfo.current = { offsetX, offsetY, finalWidth, finalHeight };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceToDraw, offsetX, offsetY, finalWidth, finalHeight);

    const now = performance.now();
    const animationDuration = 500;

    dents.forEach(dent => {
      const centerX = offsetX + dent.x * finalWidth;
      const centerY = offsetY + dent.y * finalHeight;
      const radius = dent.radius * Math.min(finalWidth, finalHeight);
      
      const shadowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGradient.addColorStop(0.7, dent.shadowColor.replace(/[\d\.]+\)$/, '0.3)'));
      shadowGradient.addColorStop(1, dent.shadowColor.replace(/[\d\.]+\)$/, '0.7)'));
      ctx.fillStyle = shadowGradient;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, radius * 0.8, dent.rotation, 0, Math.PI * 2);
      ctx.fill();

      const highlightGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
      highlightGradient.addColorStop(0, dent.highlightColor);
      highlightGradient.addColorStop(1, dent.highlightColor.replace(/[\d\.]+\)$/, '0)'));
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 0.8, radius, dent.rotation, 0, Math.PI * 2);
      ctx.fill();
      
      const age = now - dent.createdAt;
      if (age < animationDuration) {
          const progress = age / animationDuration;
          const easeOutProgress = 1 - Math.pow(1 - progress, 3);
          const rippleRadius = radius * (1 + easeOutProgress * 2);
          const rippleOpacity = 1 - progress;
          const rippleWidth = 3 * (1 - easeOutProgress);
          ctx.strokeStyle = `rgba(250, 204, 21, ${rippleOpacity * 0.8})`;
          ctx.lineWidth = rippleWidth;
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, 2 * Math.PI);
          ctx.stroke();
      }
    });

    shoeAnimations.forEach(anim => {
        const age = now - anim.createdAt;
        const duration = 500;
        const impactTime = 250;

        if (age > duration) return;

        const progress = age / duration;
        let swingProgress = 0;
        const isImpacting = age > impactTime && age < impactTime + 150;
        
        if (age < impactTime) { // Swing in
            const t = age / impactTime;
            swingProgress = 1 - Math.pow(1 - t, 3); // easeOut
        } else { // Recoil
            const t = (age - impactTime) / (duration - impactTime);
            swingProgress = 1 - (t * t); // easeIn
        }
        
        const targetX = offsetX + anim.x * finalWidth;
        const targetY = offsetY + anim.y * finalHeight;
        
        const angle = anim.rotation - Math.PI / 2;
        const radius = finalWidth * 0.4;
        const startX = targetX + Math.cos(angle) * radius;
        const startY = targetY + Math.sin(angle) * radius;
        
        const shoeX = startX + (targetX - startX) * swingProgress;
        const shoeY = startY + (targetY - startY) * swingProgress;
        const shoeRotation = anim.rotation + Math.PI / 4 + (1 - swingProgress) * 0.8;
        
        const drawShoe = (ctx: CanvasRenderingContext2D, size: number) => {
            // Sole
            ctx.fillStyle = '#292524'; // Very dark grey
            ctx.beginPath();
            ctx.ellipse(0, size * 0.05, size * 0.55, size * 1.05, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main shoe body (worn leather)
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.5, size, 0, 0, Math.PI * 2);
            ctx.fill();

            // Opening
            ctx.fillStyle = '#292524';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.5, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Scuff marks
            ctx.fillStyle = 'rgba(200, 180, 160, 0.1)';
            ctx.beginPath();
            ctx.ellipse(size * 0.2, size * 0.3, size * 0.1, size * 0.2, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-size * 0.15, size * 0.6, size * 0.15, size * 0.1, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Sole tread
            ctx.strokeStyle = '#44403c';
            ctx.lineWidth = size * 0.05;
            for(let i = 0; i < 5; i++) {
                const y = size * (0.9 - i * 0.2);
                ctx.beginPath();
                ctx.moveTo(-size * 0.5, y);
                ctx.lineTo(size * 0.5, y);
                ctx.stroke();
            }
        };

        ctx.save();
        ctx.translate(shoeX, shoeY);
        ctx.rotate(shoeRotation);
        drawShoe(ctx, anim.size * Math.min(finalWidth, finalHeight));
        ctx.restore();
        
        if (isImpacting) {
            const impactProgress = (age - impactTime) / 150;
            const easeOutProg = 1 - Math.pow(1 - impactProgress, 4);
            const radius = anim.size * 1.5 * Math.min(finalWidth, finalHeight);
            const opacity = 1 - impactProgress * impactProgress;
            
            ctx.save();
            ctx.translate(targetX, targetY);
            
            switch (anim.effectType) {
                case 'star': {
                    const outerRadius = radius * (1 + easeOutProg * 2.5);
                    const innerRadius = outerRadius * 0.5;
                    ctx.rotate(impactProgress * Math.PI / 4);
                    ctx.strokeStyle = `rgba(255, 220, 0, ${opacity})`;
                    ctx.lineWidth = 4 * (1 - easeOutProg);
                    ctx.lineCap = 'round';
                    const starPoints = 8;
                    ctx.beginPath();
                    for (let i = 0; i < starPoints * 2; i++) {
                        const r = (i % 2 === 0) ? outerRadius : innerRadius;
                        const angle = (i / (starPoints * 2)) * Math.PI * 2;
                        const x = Math.cos(angle) * r;
                        const y = Math.sin(angle) * r;
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;
                }
                case 'dizzy': {
                    const maxRadius = radius * 1.5 * (1 - easeOutProg);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.lineWidth = 6 * (1 - easeOutProg);
                    ctx.beginPath();
                    for (let i = 0; i < 100; i++) {
                        const angle = 0.1 * i;
                        const r = maxRadius * (1 - (i/100));
                        const x = Math.cos(angle) * r;
                        const y = Math.sin(angle) * r;
                        if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                    }
                    ctx.stroke();
                    break;
                }
                case 'pow': {
                    const fontSize = radius * 1.5 * easeOutProg;
                    ctx.font = `bold ${fontSize}px "Comic Sans MS", "Arial", sans-serif`;
                    ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
                    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
                    ctx.lineWidth = fontSize * 0.1;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.rotate((Math.random() - 0.5) * 0.5);
                    ctx.strokeText("POW!", 0, 0);
                    ctx.fillText("POW!", 0, 0);
                    break;
                }
            }

            ctx.restore();
        }
    });

    burns.forEach(burn => {
        const centerX = offsetX + burn.x * finalWidth;
        const centerY = offsetY + burn.y * finalHeight;
        const baseRadius = burn.radius * Math.min(finalWidth, finalHeight);
        const intensity = Math.min(1.2, burn.intensity);

        const drawIrregularPath = (ctx: CanvasRenderingContext2D, radius: number) => {
            ctx.beginPath();
            if (!burn.shapePoints || burn.shapePoints.length === 0) {
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                return;
            }

            const points = burn.shapePoints.map(p => ({
                x: centerX + Math.cos(p.angle) * radius * p.radius,
                y: centerY + Math.sin(p.angle) * radius * p.radius,
            }));

            if (points.length < 2) {
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                return;
            }

            ctx.moveTo((points[0].x + points[points.length - 1].x) / 2, (points[0].y + points[points.length - 1].y) / 2);

            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            }
            ctx.closePath();
        };
        
        ctx.save();
        
        const { r, g, b } = burn.baseColor;

        // Layer 1: Inflamed Outer Ring (soft-light)
        const irritationColor = `rgba(${Math.min(255, r + 80)}, ${g}, ${b}, ${0.5 * intensity})`;
        ctx.globalCompositeOperation = 'soft-light';
        const irritationGrad = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, baseRadius * 1.8);
        irritationGrad.addColorStop(0, irritationColor);
        irritationGrad.addColorStop(1, `rgba(${r + 50}, ${g}, ${b}, 0)`);
        ctx.fillStyle = irritationGrad;
        drawIrregularPath(ctx, baseRadius * 1.8);
        ctx.fill();
        
        // Layer 2: Scorched Tissue (color-burn)
        ctx.globalCompositeOperation = 'color-burn';
        const scorchColor = `rgba(90, 45, 15, ${0.8 * intensity})`;
        const scorchGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
        scorchGrad.addColorStop(0, scorchColor);
        scorchGrad.addColorStop(1, 'rgba(50, 20, 10, 0)');
        ctx.fillStyle = scorchGrad;
        drawIrregularPath(ctx, baseRadius);
        ctx.fill();

        // Layer 3: Charred Center (multiply)
        ctx.globalCompositeOperation = 'multiply';
        const charColor = `rgba(80, 40, 30, ${0.7 * intensity})`;
        const charGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 0.6);
        charGrad.addColorStop(0, charColor);
        charGrad.addColorStop(1, 'rgba(30, 0, 0, 0)');
        ctx.fillStyle = charGrad;
        drawIrregularPath(ctx, baseRadius * 0.6);
        ctx.fill();
        
        ctx.restore();
    });

    spiders.forEach(spider => {
      const cx = offsetX + spider.x * finalWidth;
      const cy = offsetY + spider.y * finalHeight;
      const size = spider.size * Math.min(finalWidth, finalHeight);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spider.rotation + Math.PI / 2); // adjust rotation to face forward
      drawSpider(ctx, size);
      ctx.restore();
    });

    needles.forEach(needle => {
        const cx = offsetX + needle.x * finalWidth;
        const cy = offsetY + needle.y * finalHeight;
        const length = needle.length * Math.min(finalWidth, finalHeight);
        const headRadius = 4.5;
        const shaftWidth = 2;

        ctx.fillStyle = 'rgba(10, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy, shaftWidth / 1.5, 0, Math.PI * 2);
        ctx.fill();

        const woundGradient = ctx.createRadialGradient(cx, cy, shaftWidth, cx, cy, headRadius * 2.5);
        woundGradient.addColorStop(0, 'rgba(150, 50, 50, 0.4)');
        woundGradient.addColorStop(0.7, 'rgba(100, 30, 30, 0.2)');
        woundGradient.addColorStop(1, 'rgba(100, 30, 30, 0)');
        ctx.fillStyle = woundGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, headRadius * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(needle.rotation);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        const entryOffset = -2;

        const shaftGradient = ctx.createLinearGradient(-shaftWidth, 0, shaftWidth, 0);
        shaftGradient.addColorStop(0, '#71717a');
        shaftGradient.addColorStop(0.4, '#e5e5e5');
        shaftGradient.addColorStop(1, '#a1a1aa');

        ctx.strokeStyle = shaftGradient;
        ctx.lineWidth = shaftWidth;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(0, entryOffset);
        ctx.lineTo(0, -length);
        ctx.stroke();

        ctx.fillStyle = needle.color;
        ctx.beginPath();
        ctx.arc(0, -length, headRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        const gradient = ctx.createRadialGradient(
            -headRadius * 0.4, -length - headRadius * 0.4, 0,
            -headRadius * 0.4, -length - headRadius * 0.4, headRadius * 1.5
        );
        gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, -length, headRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    });

    bruises.forEach(bruise => {
      const centerX = offsetX + bruise.x * finalWidth;
      const centerY = offsetY + bruise.y * finalHeight;
      const radiusX = bruise.radius * bruise.aspectRatio * Math.min(finalWidth, finalHeight);
      const radiusY = bruise.radius * Math.min(finalWidth, finalHeight);
      const intensity = bruise.intensity;

      ctx.save();

      ctx.globalCompositeOperation = 'overlay';
      const irritationRadius = Math.max(radiusX, radiusY) * 2.5;
      const irritationGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, irritationRadius
      );
      irritationGradient.addColorStop(0, `rgba(220, 80, 80, ${0.35 * intensity})`);
      irritationGradient.addColorStop(0.5, `rgba(200, 100, 100, ${0.2 * intensity})`);
      irritationGradient.addColorStop(1, 'rgba(200, 100, 100, 0)');
      ctx.fillStyle = irritationGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, irritationRadius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, bruise.rotation, 0, 2 * Math.PI);

      ctx.globalCompositeOperation = 'multiply';
      const shadowGradient = ctx.createRadialGradient(
          centerX + radiusX * 0.3, centerY + radiusY * 0.3, 0,
          centerX, centerY, Math.max(radiusX, radiusY) * 1.5
      );
      shadowGradient.addColorStop(0, 'rgba(100, 40, 40, 0)');
      shadowGradient.addColorStop(1, `rgba(100, 40, 40, ${0.4 * intensity})`);
      ctx.fillStyle = shadowGradient;
      ctx.fill();

      ctx.globalCompositeOperation = 'soft-light';
      const bodyGradient = ctx.createRadialGradient(
          centerX - radiusX * 0.3, centerY - radiusY * 0.3, 0,
          centerX, centerY, Math.max(radiusX, radiusY)
      );
      bodyGradient.addColorStop(0, `rgba(255, 250, 220, ${0.9 * intensity})`);
      bodyGradient.addColorStop(1, `rgba(255, 220, 200, ${0.6 * intensity})`);
      ctx.fillStyle = bodyGradient;
      ctx.fill();
      
      ctx.globalCompositeOperation = 'overlay';
      const highlightRadius = Math.max(radiusX, radiusY);
      const highlightGradient = ctx.createRadialGradient(
          centerX - radiusX * 0.4, centerY - radiusY * 0.4, 0,
          centerX - radiusX * 0.4, centerY - radiusY * 0.4, highlightRadius * 0.7
      );
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
      highlightGradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.7 * intensity})`);
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.fill();

      ctx.restore();
    });
    
    swellings.forEach(swell => {
      const age = performance.now() - swell.createdAt;
      const animDuration = 500;

      const progress = Math.min(age / animDuration, 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const currentIntensity = swell.intensity * easeOutProgress;
      if (currentIntensity <= 0) return;

      const centerX = offsetX + swell.x * finalWidth;
      const centerY = offsetY + swell.y * finalHeight;
      const radiusX = swell.radius * swell.aspectRatio * Math.min(finalWidth, finalHeight);
      const radiusY = swell.radius * Math.min(finalWidth, finalHeight);
      
      ctx.save();
      
      ctx.globalCompositeOperation = 'overlay';
      const baseRadius = Math.max(radiusX, radiusY) * 1.8;
      const grad1 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
      grad1.addColorStop(0.2, `rgba(200, 40, 40, ${0.5 * currentIntensity})`);
      grad1.addColorStop(1, `rgba(200, 40, 40, 0)`);
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'soft-light';
      const grad2 = ctx.createRadialGradient(
          centerX - radiusX * 0.2, centerY - radiusY * 0.2, 0,
          centerX, centerY, Math.max(radiusX, radiusY) * 1.2
      );
      grad2.addColorStop(0, `rgba(255, 200, 200, ${0.6 * currentIntensity})`);
      grad2.addColorStop(1, `rgba(255, 200, 200, 0)`);
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, swell.rotation, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.globalCompositeOperation = 'color-burn';
      const grad3 = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, Math.max(radiusX, radiusY)
      );
      grad3.addColorStop(0, `rgba(150, 0, 0, ${0.4 * currentIntensity})`);
      grad3.addColorStop(0.8, `rgba(150, 0, 0, 0)`);
      ctx.fillStyle = grad3;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, swell.rotation, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    });
    
    phlegms.forEach(p => {
        const centerX = offsetX + p.x * finalWidth;
        const centerY = offsetY + p.y * finalHeight;
        const radiusX = p.size * Math.min(finalWidth, finalHeight);
        const radiusY = radiusX * 0.8;
        const { r, g, b } = p.baseColor;
        
        ctx.save();
        
        // Pass 1: Main body using 'overlay' for color blending. Paler and more watery.
        ctx.globalCompositeOperation = 'overlay';
        const bodyGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusX * 1.2);
        bodyGrad.addColorStop(0, `rgba(${(r + 250) / 2}, ${(g + 255) / 2}, ${(b + 250) / 2}, 0.12)`);
        bodyGrad.addColorStop(0.7, `rgba(${(r + 240) / 2}, ${(g + 250) / 2}, ${(b + 245) / 2}, 0.08)`);
        bodyGrad.addColorStop(1, `rgba(${(r + 200) / 2}, ${(g + 220) / 2}, ${(b + 210) / 2}, 0)`);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, p.rotation, 0, 2 * Math.PI);
        ctx.fill();

        // Pass 2: Subtler darker core using 'multiply' for depth.
        ctx.globalCompositeOperation = 'multiply';
        const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusX * 0.8);
        coreGrad.addColorStop(0, `rgba(${r * 0.95}, ${g * 0.95}, ${b * 0.95}, 0.03)`);
        coreGrad.addColorStop(1, `rgba(${r * 0.8}, ${g * 0.8}, ${b * 0.8}, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX * 0.8, radiusY * 0.8, p.rotation, 0, 2 * Math.PI);
        ctx.fill();

        // Pass 3: Purer white, wet highlight using 'soft-light'.
        ctx.globalCompositeOperation = 'soft-light';
        const highlightRadius = radiusX * 0.6;
        const highlightX = centerX - radiusX * 0.3;
        const highlightY = centerY - radiusY * 0.3;
        const highlightGrad = ctx.createRadialGradient(
            highlightX, highlightY, 0, 
            highlightX, highlightY, highlightRadius
        );
        highlightGrad.addColorStop(0, `rgba(255, 255, 255, 0.9)`); 
        highlightGrad.addColorStop(0.5, `rgba(255, 255, 255, 0.75)`);
        highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, p.rotation, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
    });

    smoke.forEach(s => {
        const age = now - s.createdAt;
        const life = 1500;
        if (age > life) return;

        const progress = age / life;
        const currentOpacity = s.opacity * (1 - progress);

        ctx.fillStyle = `rgba(100, 100, 100, ${currentOpacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(
            offsetX + s.x * finalWidth, 
            offsetY + s.y * finalHeight, 
            s.size * (1 + progress * 2) * Math.min(finalWidth, finalHeight), 
            0, 2 * Math.PI
        );
        ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';

    slapAnimations.forEach(anim => {
        const age = now - anim.createdAt;
        const duration = 400;

        if (age > duration) return;

        const progress = age / duration;

        ctx.save();
        
        const size = anim.size * Math.min(finalWidth, finalHeight);
        
        const startDist = size * 2.5;
        let currentDist = 0;
        let alpha = 1.0;
        
        if (progress < 0.25) {
            const t = progress / 0.25;
            const easeOutT = 1 - Math.pow(1 - t, 3);
            currentDist = startDist * (1 - easeOutT);
            alpha = t;
        } else {
            const t = (progress - 0.25) / 0.75;
            const easeInT = t * t;
            currentDist = easeInT * (startDist * 0.5);
            alpha = 1 - t;
        }

        const angle = anim.rotation - Math.PI / 2;
        const handX = offsetX + anim.x * finalWidth + Math.cos(angle) * currentDist;
        const handY = offsetY + anim.y * finalHeight + Math.sin(angle) * currentDist;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgba(255, 220, 200, ${alpha * 0.9})`;

        ctx.translate(handX, handY);
        ctx.rotate(anim.rotation);
        
        const drawHandPrint = (ctx: CanvasRenderingContext2D, size: number) => {
            const drawFinger = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.beginPath();
                ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };
            const palmWidth = size;
            const palmHeight = size * 1.1;
            ctx.beginPath();
            ctx.ellipse(0, 0, palmWidth / 2, palmHeight / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            const fingerWidth = size * 0.25;
            const fingerLength = size * 0.9;
            const fingerBaseY = -palmHeight / 2;
            drawFinger(ctx, -palmWidth * 0.35, fingerBaseY, fingerWidth * 0.8, fingerLength * 0.7, 0.2);
            drawFinger(ctx, -palmWidth * 0.1, fingerBaseY, fingerWidth, fingerLength * 0.9, 0.05);
            drawFinger(ctx, palmWidth * 0.15, fingerBaseY, fingerWidth, fingerLength, -0.05);
            drawFinger(ctx, palmWidth * 0.38, fingerBaseY, fingerWidth * 0.95, fingerLength * 0.85, -0.2);
            ctx.save();
            ctx.translate(-palmWidth/2 * 0.8, palmHeight/2 * 0.4);
            ctx.rotate(-0.9);
            ctx.beginPath();
            ctx.ellipse(0, 0, fingerWidth * 1.1, fingerLength * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        drawHandPrint(ctx, size);

        ctx.restore();
    });

    flameParticles.forEach(p => {
        const lifeRatio = p.life / p.maxLife;
        const currentSize = p.size * lifeRatio;
        if (currentSize <= 0) return;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
        
        grad.addColorStop(0, `rgba(255, 220, 150, ${lifeRatio * 0.9})`);
        grad.addColorStop(0.3, `rgba(255, 150, 0, ${lifeRatio * 0.7})`);
        grad.addColorStop(0.8, `rgba(200, 50, 0, ${lifeRatio * 0.2})`);
        grad.addColorStop(1, `rgba(50, 0, 0, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
    });


  }, [dents, shoeAnimations, spiders, needles, bruises, swellings, slapAnimations, smoke, phlegms, burns, flameParticles]);
  
  const resetState = useCallback(() => {
    if (imageSrc && imageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageFile(null);
    setImageSrc(null);
    setFaceBox(null);
    setDents([]);
    setShoeAnimations([]);
    setSpiders([]);
    setNeedles([]);
    setBruises([]);
    setSwellings([]);
    setSlapAnimations([]);
    setBurns([]);
    setSmoke([]);
    setPhlegms([]);
    setFlameParticles([]);
    setIsLoading(false);
    setError(null);
    setWarning(null);
    setIsHoveringFace(false);
    setMousePosition(null);
    setHitCount(0);
    if (!user) {
        setCredits(20);
    }
    setHasDestructiveChanges(false);
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    offscreenCanvasRef.current = null;
  }, [imageSrc, user]);
  
  const resetEffects = useCallback(() => {
    setDents([]);
    setShoeAnimations([]);
    setSpiders([]);
    setNeedles([]);
    setBruises([]);
    setSwellings([]);
    setSlapAnimations([]);
    setBurns([]);
    setSmoke([]);
    setPhlegms([]);
    setFlameParticles([]);
    setHitCount(0);
    setHasDestructiveChanges(false);

    const offscreenCanvas = offscreenCanvasRef.current;
    const image = imageRef.current;
    if (offscreenCanvas && image && image.complete) {
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (offscreenCtx) {
            offscreenCanvas.width = image.naturalWidth;
            offscreenCanvas.height = image.naturalHeight;
            offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            offscreenCtx.drawImage(image, 0, 0);
            redrawCanvas();
        }
    }
  }, [redrawCanvas]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !imageSrc) return;

    const initializeCanvases = () => {
        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offscreenCanvas = offscreenCanvasRef.current;
        offscreenCanvas.width = image.naturalWidth;
        offscreenCanvas.height = image.naturalHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
        offscreenCtx?.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
        
        redrawCanvas();
    };

    if (image.complete && image.naturalWidth > 0) {
        initializeCanvases();
    } else {
        image.addEventListener('load', initializeCanvases);
    }

    return () => {
        image.removeEventListener('load', initializeCanvases);
    };
  }, [imageSrc, redrawCanvas]);

  useEffect(() => {
    window.addEventListener('resize', redrawCanvas);
    return () => window.removeEventListener('resize', redrawCanvas);
  }, [redrawCanvas]);
  
  // Effect to manage classic punch audio playback, preventing interruptions.
  useEffect(() => {
    // If the conditions to play are not met, we don't start anything.
    // The cleanup function from a previous render (if any) will handle pausing.
    if (activeTool !== 'classic' || !imageSrc) {
      return;
    }
    
    // Lazily create the audio element instance.
    if (!classicAudioRef.current) {
      classicAudioRef.current = new Audio('https://globalcareasia.com/extracted_audio.mp3');
      classicAudioRef.current.loop = true;
    }
    const audio = classicAudioRef.current;

    // Play the audio and handle potential errors.
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // This error is expected and safe to ignore if the user quickly
        // switches away from the tool, causing the play promise to be aborted.
        if (error.name !== 'AbortError') {
          console.error('Audio play failed:', error);
        }
      });
    }

    // This cleanup function is crucial. It runs when the tool is switched
    // or the image is removed, pausing the audio correctly.
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [activeTool, imageSrc]);

  // Effect to handle final audio resource cleanup on component unmount.
  // This prevents "no supported sources" errors on teardown.
  useEffect(() => {
    return () => {
      const audio = classicAudioRef.current;
      if (audio) {
        audio.pause();
        // Set src to an empty string before calling load() to safely release the audio resource.
        // This prevents the "no supported source" error in the console.
        audio.src = '';
        audio.load();
        classicAudioRef.current = null;
      }
    };
  }, []);
  
  // Unified render loop
  useEffect(() => {
      let animationFrameId: number;

      const animate = () => {
          const now = performance.now();
          const dentDuration = 500;
          const swellingDuration = 500;
          const slapAnimationDuration = 400;
          const shoeAnimationDuration = 500;
          const smokeDuration = 1500;

          // Update spider positions
          setSpiders(currentSpiders => currentSpiders.map(spider => {
              const dx = spider.targetX - spider.x;
              const dy = spider.targetY - spider.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              let newTargetX = spider.targetX;
              let newTargetY = spider.targetY;
              let newSpeed = spider.speed;

              if (dist < 0.04) {
                  if (faceBox) {
                      newTargetX = faceBox.x + Math.random() * faceBox.width;
                      newTargetY = faceBox.y + Math.random() * faceBox.height;
                  } else {
                      newTargetX = Math.random();
                      newTargetY = Math.random();
                  }
                  newSpeed = 0.002 + Math.random() * 0.003;
              }
              
              const angle = Math.atan2(dy, dx);
              const wander = (Math.random() - 0.5) * 0.4;
              const newRotation = angle + wander;

              const newX = spider.x + Math.cos(newRotation) * newSpeed;
              const newY = spider.y + Math.sin(newRotation) * newSpeed;
              
              return { ...spider, x: newX, y: newY, rotation: newRotation, targetX: newTargetX, targetY: newTargetY, speed: newSpeed };
          }));

          setSmoke(currentSmoke => 
              currentSmoke.map(s => ({
                  ...s,
                  x: s.x + s.vx,
                  y: s.y + s.vy,
                  vy: s.vy - 0.00001,
              })).filter(s => (now - s.createdAt) < smokeDuration)
          );
          
          setFlameParticles(currentFlames => 
              currentFlames.map(p => ({
                  ...p,
                  x: p.x + p.vx,
                  y: p.y + p.vy,
                  vy: p.vy - 0.08,
                  life: p.life - 1,
                  size: p.size * 0.98,
              })).filter(p => p.life > 0)
          );

          const needsAnimation = 
              dents.some(d => (now - d.createdAt) < dentDuration) ||
              shoeAnimations.some(s => (now - s.createdAt) < shoeAnimationDuration) ||
              swellings.some(s => (now - s.createdAt) < swellingDuration) ||
              slapAnimations.some(a => (now - a.createdAt) < slapAnimationDuration) ||
              smoke.some(s => (now - s.createdAt) < smokeDuration) ||
              flameParticles.length > 0 ||
              spiders.length > 0;

          if (needsAnimation) {
              redrawCanvas();
              animationFrameId = requestAnimationFrame(animate);
          } else {
              setSlapAnimations(prev => prev.filter(a => (now - a.createdAt) < slapAnimationDuration));
              setShoeAnimations(prev => prev.filter(a => (now - a.createdAt) < shoeAnimationDuration));
              setSmoke(prev => prev.filter(s => (now - s.createdAt) < smokeDuration));
              redrawCanvas(); // Final draw to ensure everything is up to date
          }
      };
      
      // Call redraw whenever any visual effect changes, even static ones.
      redrawCanvas();
      
      // Start animation loop if there are animated effects.
      const now = performance.now();
      const dentDuration = 500;
      const swellingDuration = 500;
      const slapAnimationDuration = 400;
      const shoeAnimationDuration = 500;
      const smokeDuration = 1500;
      const needsAnimation = 
          dents.some(d => (now - d.createdAt) < dentDuration) ||
          shoeAnimations.some(s => (now - s.createdAt) < shoeAnimationDuration) ||
          swellings.some(s => (now - s.createdAt) < swellingDuration) ||
          slapAnimations.some(a => (now - a.createdAt) < slapAnimationDuration) ||
          smoke.some(s => (now - s.createdAt) < smokeDuration) ||
          flameParticles.length > 0 ||
          spiders.length > 0;

      if(needsAnimation) {
        animationFrameId = requestAnimationFrame(animate);
      }

      return () => {
          cancelAnimationFrame(animationFrameId);
      };
  }, [dents, shoeAnimations, spiders, swellings, slapAnimations, smoke, phlegms, burns, flameParticles, faceBox, redrawCanvas]);


  const processImageAndDetectFace = useCallback(async () => {
    if (!imageFile || !imageRef.current || !imageRef.current.complete || imageRef.current.naturalWidth === 0) {
        return;
    }

    setIsLoading(true);
    setError(null);
    setWarning(null);
    setFaceBox(null);
    setDents([]);
    setShoeAnimations([]);
    setSpiders([]);
    setNeedles([]);
    setBruises([]);
    setSwellings([]);
    setSlapAnimations([]);
    setBurns([]);
    setSmoke([]);
    setPhlegms([]);
    setFlameParticles([]);
    setHitCount(0);

    const imageElement = imageRef.current;
    let detectedFace: FaceBoundingBox | null = null;

    // 1. Try Local Face Detection first for speed.
    try {
        // @ts-ignore - FaceDetector is experimental
        if ('FaceDetector' in window && window.FaceDetector) {
            // @ts-ignore
            const faceDetector = new window.FaceDetector();
            const faces = await faceDetector.detect(imageElement);
            if (faces.length > 0) {
                const largestFace = faces.reduce((a: any, b: any) => (a.boundingBox.width * a.boundingBox.height > b.boundingBox.width * b.boundingBox.height ? a : b));
                const { boundingBox } = largestFace;
                if (boundingBox.width > 0 && boundingBox.height > 0) {
                    detectedFace = {
                        x: boundingBox.x / imageElement.naturalWidth,
                        y: boundingBox.y / imageElement.naturalHeight,
                        width: boundingBox.width / imageElement.naturalWidth,
                        height: boundingBox.height / imageElement.naturalHeight,
                    };
                }
            }
        }
    } catch (err) {
        console.warn("Local face detection failed, falling back to AI.", err);
    }

    // 2. Fallback to AI Face Detection if local detection fails or is not supported.
    if (!detectedFace) {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = imageElement.naturalWidth;
                canvas.height = imageElement.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Could not create canvas context");
                ctx.drawImage(imageElement, 0, 0);
                const base64String = canvas.toDataURL(imageFile.type).split(',')[1];
                
                if (!base64String) {
                  throw new Error('Could not read image file.');
                }
                
                const aiDetectedFace = await detectFace(base64String, imageFile.type);
                if (aiDetectedFace) {
                  detectedFace = aiDetectedFace;
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred during AI face detection.');
                console.error(err);
            }
        }
    }

    // 3. Update state with the result.
    if (detectedFace) {
        setFaceBox(detectedFace);
    } else {
        setFaceBox(null);
        // Do not show a UI warning; just log it. The app is fully functional without face detection.
        console.warn(t('ai.face_detection_failed_fallback'));
    }
    
    setIsLoading(false);
  }, [imageFile, t]);

  useEffect(() => {
    const img = imageRef.current;
    if (img && imageSrc) {
        const handleLoad = () => {
            processImageAndDetectFace();
        };
        img.addEventListener('load', handleLoad);
        // If image is already complete (e.g., from cache), run detection immediately.
        if (img.complete && img.naturalWidth > 0) {
            handleLoad();
        }
        return () => {
            img.removeEventListener('load', handleLoad);
        };
    }
  }, [imageSrc, processImageAndDetectFace]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageFile(file);
      setImageSrc(URL.createObjectURL(file));
      
      // Reset all states, detection will be triggered by useEffect on imageSrc change
      setFaceBox(null);
      setDents([]);
      setShoeAnimations([]);
      setSpiders([]);
      setNeedles([]);
      setBruises([]);
      setSwellings([]);
      setSlapAnimations([]);
      setBurns([]);
      setSmoke([]);
      setPhlegms([]);
      setFlameParticles([]);
      setHitCount(0);
      setHasDestructiveChanges(false);
      setWarning(null);
      setError(null);
      offscreenCanvasRef.current = null;
    }
  };

    const handleCloseCamera = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        setIsCameraOpen(false);
    }, []);

    const handleCapture = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `poppet-punch-${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                if (imageSrc) URL.revokeObjectURL(imageSrc);
                setImageFile(file);
                setImageSrc(URL.createObjectURL(file));
                
                setFaceBox(null);
                setDents([]);
                setShoeAnimations([]);
                setSpiders([]);
                setNeedles([]);
                setBruises([]);
                setSwellings([]);
                setSlapAnimations([]);
                setBurns([]);
                setSmoke([]);
                setPhlegms([]);
                setFlameParticles([]);
                setHitCount(0);
                setHasDestructiveChanges(false);
                setWarning(null);
                setError(null);
                offscreenCanvasRef.current = null;

                handleCloseCamera();
            }
        }, 'image/jpeg', 0.9);
    }, [imageSrc, handleCloseCamera]);

    const handleOpenCamera = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError(t('camera.error_access'));
            return;
        }
        
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            mediaStreamRef.current = stream;
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Camera access denied:", err);
            setError(t('camera.error_access'));
        }
    }, [t]);

    useEffect(() => {
        if (isCameraOpen && videoRef.current && mediaStreamRef.current) {
            const videoEl = videoRef.current;
            if (videoEl.srcObject !== mediaStreamRef.current) {
                videoEl.srcObject = mediaStreamRef.current;
                videoEl.play().catch(err => {
                    console.error("Error playing video stream:", err);
                    setError(t('camera.error_access'));
                });
            }
        }
    }, [isCameraOpen, t]);

  const getPosOnImage = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const { offsetX, offsetY, finalWidth, finalHeight } = renderInfo.current;
    if (mouseX < offsetX || mouseX > offsetX + finalWidth || mouseY < offsetY || mouseY > offsetY + finalHeight) return null;
    return { x: (mouseX - offsetX) / finalWidth, y: (mouseY - offsetY) / finalHeight, absoluteX: mouseX, absoluteY: mouseY };
  }, []);
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported.", e);
            return null;
        }
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);
  
  const playTornadoSound = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const noise = audioContext.createBufferSource();
    const bufferSize = audioContext.sampleRate * 0.3;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.value = 2;
    bandpass.frequency.setValueAtTime(400, now);
    bandpass.frequency.exponentialRampToValueAtTime(1500, now + 0.15);
    bandpass.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.3);
  }, [getAudioContext]);
  
  const applyTornadoEffect = (canvasX: number, canvasY: number) => {
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!offscreenCanvas) return;

    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    if (!offscreenCtx) return;

    const { finalWidth, finalHeight, offsetX, offsetY } = renderInfo.current;
    
    const imageX = ((canvasX - offsetX) / finalWidth) * offscreenCanvas.width;
    const imageY = ((canvasY - offsetY) / finalHeight) * offscreenCanvas.height;

    const radius = (strength / 100) * (Math.min(offscreenCanvas.width, offscreenCanvas.height) * 0.15);
    const angle = (strength / 100) * Math.PI;

    if (radius <= 0) return;

    const startX = Math.floor(Math.max(0, imageX - radius));
    const startY = Math.floor(Math.max(0, imageY - radius));
    const width = Math.floor(Math.min(offscreenCanvas.width, imageX + radius)) - startX;
    const height = Math.floor(Math.min(offscreenCanvas.height, imageY + radius)) - startY;

    if (width <= 0 || height <= 0) return;

    const originalData = offscreenCtx.getImageData(startX, startY, width, height);
    const warpedData = offscreenCtx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const currentX = startX + x;
            const currentY = startY + y;

            const dx = currentX - imageX;
            const dy = currentY - imageY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const pixelIndex = (y * width + x) * 4;

            if (distance < radius) {
                const percent = 1 - (distance / radius);
                const theta = Math.atan2(dy, dx);
                const twistAngle = percent * percent * angle;

                const srcX = Math.floor(imageX + distance * Math.cos(theta - twistAngle));
                const srcY = Math.floor(imageY + distance * Math.sin(theta - twistAngle));
                
                if (srcX >= startX && srcX < startX + width && srcY >= startY && srcY < startY + height) {
                    const srcIndex = ((srcY - startY) * width + (srcX - startX)) * 4;
                    warpedData.data[pixelIndex] = originalData.data[srcIndex];
                    warpedData.data[pixelIndex + 1] = originalData.data[srcIndex + 1];
                    warpedData.data[pixelIndex + 2] = originalData.data[srcIndex + 2];
                    warpedData.data[pixelIndex + 3] = originalData.data[srcIndex + 3];
                } else {
                    warpedData.data[pixelIndex] = originalData.data[pixelIndex];
                    warpedData.data[pixelIndex + 1] = originalData.data[pixelIndex + 1];
                    warpedData.data[pixelIndex + 2] = originalData.data[pixelIndex + 2];
                    warpedData.data[pixelIndex + 3] = originalData.data[pixelIndex + 3];
                }
            } else {
                warpedData.data[pixelIndex] = originalData.data[pixelIndex];
                warpedData.data[pixelIndex + 1] = originalData.data[pixelIndex + 1];
                warpedData.data[pixelIndex + 2] = originalData.data[pixelIndex + 2];
                warpedData.data[pixelIndex + 3] = originalData.data[pixelIndex + 3];
            }
        }
    }
    
    offscreenCtx.putImageData(warpedData, startX, startY);
    setHasDestructiveChanges(true);

    const now = performance.now();
    if (now - lastTornadoSoundTime.current > 150) {
        playTornadoSound();
        lastTornadoSoundTime.current = now;
    }
    redrawCanvas();
  };

  const playAiSound = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const osc = audioContext.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.2);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }, [getAudioContext]);
  
// Fix: Refactored handleAIEffect to correctly manage loading state and restore non-destructive effects.
    const handleAIEffect = async (promptGenerator: (strength: number) => string) => {
        if (!offscreenCanvasRef.current || !imageFile) return;

        playAiSound();
        setIsLoading(true);
        setError(null);

        nonDestructiveEffectsBackup.current = { dents, spiders, needles, bruises, swellings };
        setDents([]);
        setSpiders([]);
        setNeedles([]);
        setBruises([]);
        setSwellings([]);
        setSlapAnimations([]);
        setFlameParticles([]);

        try {
            const base64ImageData = offscreenCanvasRef.current.toDataURL(imageFile.type).split(',')[1];
            if (!base64ImageData) {
                throw new Error("Could not get image data from canvas.");
            }

            const prompt = promptGenerator(strength);
            
            const resultBase64 = await applyGenerativeImageEffect(base64ImageData, imageFile.type, prompt);

            if (resultBase64) {
                const newImage = new Image();
                newImage.onload = () => {
                    const offscreenCanvas = offscreenCanvasRef.current;
                    if (offscreenCanvas) {
                        const offscreenCtx = offscreenCanvas.getContext('2d');
                        offscreenCanvas.width = newImage.naturalWidth;
                        offscreenCanvas.height = newImage.naturalHeight;
                        offscreenCtx?.drawImage(newImage, 0, 0);
                        setHasDestructiveChanges(true);

                        // Restore non-destructive effects so they appear on the new image
                        setDents(nonDestructiveEffectsBackup.current.dents);
                        setSpiders(nonDestructiveEffectsBackup.current.spiders);
                        setNeedles(nonDestructiveEffectsBackup.current.needles);
                        setBruises(nonDestructiveEffectsBackup.current.bruises);
                        setSwellings(nonDestructiveEffectsBackup.current.swellings);
                    }
                    setIsLoading(false);
                };
                newImage.onerror = () => {
                    setError("Failed to load the generated AI image.");
                    // Restore effects on failure
                    setDents(nonDestructiveEffectsBackup.current.dents);
                    setSpiders(nonDestructiveEffectsBackup.current.spiders);
                    setNeedles(nonDestructiveEffectsBackup.current.needles);
                    setBruises(nonDestructiveEffectsBackup.current.bruises);
                    setSwellings(nonDestructiveEffectsBackup.current.swellings);
                    setIsLoading(false);
                };
                newImage.src = `data:${imageFile.type};base64,${resultBase64}`;
                setHitCount(prev => prev + 1);
            } else {
                setError("AI failed to generate the effect. These effects can be tricky, so please try again or adjust the strength.");
                setDents(nonDestructiveEffectsBackup.current.dents);
                setSpiders(nonDestructiveEffectsBackup.current.spiders);
                setNeedles(nonDestructiveEffectsBackup.current.needles);
                setBruises(nonDestructiveEffectsBackup.current.bruises);
                setSwellings(nonDestructiveEffectsBackup.current.swellings);
                setIsLoading(false);
            }
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : "An error occurred while applying the AI effect.";
            setError(message);
            setDents(nonDestructiveEffectsBackup.current.dents);
            setSpiders(nonDestructiveEffectsBackup.current.spiders);
            setNeedles(nonDestructiveEffectsBackup.current.needles);
            setBruises(nonDestructiveEffectsBackup.current.bruises);
            setSwellings(nonDestructiveEffectsBackup.current.swellings);
            setIsLoading(false);
        }
    };
    
  const playSlapSound = useCallback((strength: number) => {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      const now = audioContext.currentTime;
      const s = strength / 100;

      const thump = audioContext.createOscillator();
      thump.type = 'sine';
      
      const thumpGain = audioContext.createGain();
      const thumpStartFreq = 180 - s * 80;
      const thumpEndFreq = 50;
      const thumpVolume = 0.4 + s * 0.4;

      thump.frequency.setValueAtTime(thumpStartFreq, now);
      thump.frequency.exponentialRampToValueAtTime(thumpEndFreq, now + 0.15);
      
      thumpGain.gain.setValueAtTime(thumpVolume, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      thump.connect(thumpGain);
      thumpGain.connect(audioContext.destination);

      const bufferSize = audioContext.sampleRate * 0.1;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
      }

      const crack = audioContext.createBufferSource();
      crack.buffer = buffer;

      const crackGain = audioContext.createGain();
      const crackVolume = 0.5 + s * 0.5;
      
      crackGain.gain.setValueAtTime(0, now);
      crackGain.gain.linearRampToValueAtTime(crackVolume, now + 0.002);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + s * 0.02);

      const bandpass = audioContext.createBiquadFilter();
      bandpass.type = 'bandpass';
      const crackFreq = 2000 + s * 5000;
      bandpass.frequency.value = crackFreq;
      bandpass.Q.value = 0.8;

      crack.connect(bandpass);
      bandpass.connect(crackGain);
      crackGain.connect(audioContext.destination);

      thump.start(now);
      crack.start(now);
      
      thump.stop(now + 0.2);
  }, [getAudioContext]);
  
  const playSpiderSound = useCallback(() => {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;

      for (let i = 0; i < 6; i++) {
          const noise = audioContext.createBufferSource();
          const bufferSize = audioContext.sampleRate * 0.03;
          const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
          const output = buffer.getChannelData(0);
          for (let j = 0; j < bufferSize; j++) {
              output[j] = Math.random() * 2 - 1;
          }
          noise.buffer = buffer;

          const highpass = audioContext.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.value = 4000 + Math.random() * 2000;
          
          const gainNode = audioContext.createGain();
          gainNode.gain.setValueAtTime(0.1, now + i * 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.03);

          noise.connect(highpass);
          highpass.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          noise.start(now + i * 0.04);
          noise.stop(now + i * 0.04 + 0.03);
      }
  }, [getAudioContext]);
  
  const playNeedleSound = useCallback(() => {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;

      const plink = audioContext.createOscillator();
      plink.type = 'triangle';
      plink.frequency.setValueAtTime(2500, now);
      plink.frequency.exponentialRampToValueAtTime(1800, now + 0.2);

      const plinkGain = audioContext.createGain();
      plinkGain.gain.setValueAtTime(0.3, now);
      plinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      plink.connect(plinkGain);
      plinkGain.connect(audioContext.destination);
      
      plink.start(now);
      plink.stop(now + 0.2);
  }, [getAudioContext]);

  const playBruiseSound = useCallback((strength: number) => {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      const now = audioContext.currentTime;
      const s = strength / 100;
      
      const noise = audioContext.createBufferSource();
      const bufferSize = audioContext.sampleRate * 0.15;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      
      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1000 + s * 500, now);
      lowpass.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.6, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      noise.connect(lowpass);
      lowpass.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      noise.start(now);
      noise.stop(now + 0.15);
  }, [getAudioContext]);

  const playBurnSound = useCallback(() => {
    if (burnSoundSourceRef.current) {
      burnSoundSourceRef.current.stop();
    }
    const audioContext = getAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1200;
    bandpass.Q.value = 20;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);

    source.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.start(now);
    burnSoundSourceRef.current = source;
  }, [getAudioContext]);
  
  const stopBurnSound = useCallback(() => {
    if (burnSoundSourceRef.current) {
      burnSoundSourceRef.current.stop();
      burnSoundSourceRef.current = null;
    }
  }, []);

  const playPhlegmSound = useCallback((strength: number) => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const s = strength / 100;

    const noise = audioContext.createBufferSource();
    const bufferSize = audioContext.sampleRate * 0.1;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 6000 + s * 2000;
    bandpass.Q.value = 1.5;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.5 + s * 0.3, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    const impact = audioContext.createOscillator();
    impact.type = 'triangle';
    impact.frequency.setValueAtTime(200, now + 0.02);
    impact.frequency.exponentialRampToValueAtTime(80, now + 0.12);

    const impactGain = audioContext.createGain();
    impactGain.gain.setValueAtTime(0, now + 0.02);
    impactGain.gain.linearRampToValueAtTime(0.7, now + 0.025);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    impact.connect(impactGain);
    impactGain.connect(audioContext.destination);

    noise.start(now);
    impact.start(now + 0.02);

    noise.stop(now + 0.1);
    impact.stop(now + 0.2);
  }, [getAudioContext]);
  
  const playThudSound = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;

    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    const noise = audioContext.createBufferSource();
    const bufferSize = audioContext.sampleRate * 0.05;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.4;
    }
    noise.buffer = buffer;
    
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;

    osc.connect(gainNode);
    noise.connect(lowpass);
    lowpass.connect(noiseGain);
    
    gainNode.connect(audioContext.destination);
    noiseGain.connect(audioContext.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.2);
    noise.stop(now + 0.1);
  }, [getAudioContext]);

  const playMalletSound = useCallback((strength: number) => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const s = strength / 100;

    // A short, sharp noise burst for the impact
    const noise = audioContext.createBufferSource();
    const bufferSize = audioContext.sampleRate * 0.05;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1);
    }
    noise.buffer = buffer;

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1000 + s * 1500;
    bandpass.Q.value = 0.5 + s;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.6 + s * 0.4, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    // A low-frequency sine wave for the "thud"
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 - s * 40, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    
    const oscGain = audioContext.createGain();
    oscGain.gain.setValueAtTime(0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(audioContext.destination);

    noise.start(now);
    osc.start(now);
    noise.stop(now + 0.1);
    osc.stop(now + 0.2);
  }, [getAudioContext]);

  const applyToolEffect = (pos: { x: number; y: number; absoluteX: number; absoluteY: number; }) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'mallet') {
        const pixelData = ctx.getImageData(pos.absoluteX, pos.absoluteY, 1, 1).data;
        const [r, g, b] = pixelData;
        const shadowColor = `rgba(${Math.max(0, r-50)}, ${Math.max(0, g-50)}, ${Math.max(0, b-50)}, 0.5)`;
        const highlightColor = `rgba(${Math.min(255, r+50)}, ${Math.min(255, g+50)}, ${Math.min(255, b+50)}, 0.5)`;
        
        const baseRadius = 0.02 + (strength / 100) * 0.04;
        const randomFactor = Math.random() * 0.01;

        const newDent: Dent = {
            x: pos.x, y: pos.y,
            radius: baseRadius + randomFactor,
            rotation: Math.random() * Math.PI * 2,
            shadowColor, highlightColor, createdAt: performance.now(),
        };
        setDents(prevDents => [...prevDents, newDent]);
        playMalletSound(strength);
        setHitCount(prev => prev + 1);
    } else if (activeTool === 'hand') {
        const baseRadius = 0.06 + (strength / 100) * 0.09;
        
        const newSwelling: Swelling = {
            x: pos.x,
            y: pos.y,
            radius: baseRadius,
            intensity: strength / 100,
            aspectRatio: 1 + (Math.random() - 0.5) * 0.7,
            rotation: Math.random() * Math.PI * 2,
            createdAt: performance.now(),
        };
        setSwellings(prev => [...prev, newSwelling]);

        const slapSize = 0.08 + (strength / 100) * 0.08;
        const rotation = (Math.random() - 0.5) * 0.5;

        setSlapAnimations(prev => [...prev, {
            id: performance.now(), x: pos.x, y: pos.y, 
            size: slapSize * 1.2, rotation, createdAt: performance.now()
        }]);
        
        playSlapSound(strength);
        
        setHitCount(prev => prev + 1);
    } else if (activeTool === 'voodooSpider') {
        const baseSize = 0.015 + (strength / 100) * 0.02;
        const randomFactor = Math.random() * 0.005;

        const newSpider: Spider = {
            id: performance.now(),
            x: pos.x,
            y: pos.y,
            size: baseSize + randomFactor,
            rotation: Math.random() * Math.PI * 2,
            speed: 0.002 + Math.random() * 0.003,
            targetX: faceBox ? faceBox.x + Math.random() * faceBox.width : Math.random(),
            targetY: faceBox ? faceBox.y + Math.random() * faceBox.height : Math.random(),
            createdAt: performance.now(),
        };
        setSpiders(prev => [...prev, newSpider]);
        playSpiderSound();
        setHitCount(prev => prev + 1);
    } else if (activeTool === 'voodooNeedle') {
        const minLength = 0.03;
        const maxLength = 0.12;
        const length = minLength + (strength / 100) * (maxLength - minLength);

        const voodooColors = ['#ef4444', '#f97316', '#facc15', '#4ade80', '#3b82f6', '#a855f7'];
        const color = voodooColors[Math.floor(Math.random() * voodooColors.length)];

        const newNeedle: Needle = {
            x: pos.x,
            y: pos.y,
            length: length,
            rotation: Math.random() * Math.PI * 2,
            color: color,
        };
        setNeedles(prev => [...prev, newNeedle]);
        playNeedleSound();
        setHitCount(prev => prev + 1);
    } else if (activeTool === 'fistPunch') {
      const numBlisters = 1 + Math.floor((strength / 100) * 4);
      const newBruises: Bruise[] = [];
      const clusterRadius = 0.02 + (strength / 100) * 0.04;

      for (let i = 0; i < numBlisters; i++) {
          const isMain = i === 0;
          const radius = (0.015 + (strength / 100) * 0.03) * (isMain ? 1 : (0.2 + Math.random() * 0.5));
          const angle = Math.random() * Math.PI * 2;
          const distance = isMain ? 0 : Math.random() * clusterRadius;

          newBruises.push({
              x: pos.x + Math.cos(angle) * distance,
              y: pos.y + Math.sin(angle) * distance,
              radius: radius,
              rotation: Math.random() * Math.PI * 2,
              aspectRatio: 1 + (Math.random() - 0.5) * 0.4,
              intensity: strength / 100,
          });
      }
      setBruises(prev => [...prev, ...newBruises]);
      playBruiseSound(strength);
      setHitCount(prev => prev + 1);
    } else if (activeTool === 'phlegm') {
        const offscreenCanvas = offscreenCanvasRef.current;
        if (!offscreenCanvas) return;
        const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
        if (!offscreenCtx) return;

        const imageX = Math.floor(pos.x * offscreenCanvas.width);
        const imageY = Math.floor(pos.y * offscreenCanvas.height);
        const pixelData = offscreenCtx.getImageData(imageX, imageY, 1, 1).data;
        const baseColor = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };

        const numPhlegms = 2 + Math.floor((strength / 100) * 8);
        const newPhlegms: Phlegm[] = [];
        const clusterRadius = 0.02 + (strength / 100) * 0.06;

        for (let i = 0; i < numPhlegms; i++) {
            const isMain = i === 0;
            const size = isMain
                ? 0.03 + (strength / 100) * 0.06
                : (0.01 + Math.random() * 0.03);

            const angle = Math.random() * Math.PI * 2;
            const distance = isMain ? 0 : Math.random() * clusterRadius;

            newPhlegms.push({
                x: pos.x + Math.cos(angle) * distance,
                y: pos.y + Math.sin(angle) * distance,
                size: size,
                rotation: Math.random() * Math.PI * 2,
                createdAt: performance.now(),
                baseColor,
            });
        }
        setPhlegms(prev => [...prev, ...newPhlegms]);
        playPhlegmSound(strength);
        setHitCount(prev => prev + 1);
    } else if (activeTool === 'classic') {
        const shoeSize = 0.08 + (strength / 100) * 0.12;
        const rotation = (Math.random() - 0.5) * 0.6;
        const effects: Array<'star' | 'dizzy' | 'pow'> = ['star', 'dizzy', 'pow'];
        const effectType = effects[Math.floor(Math.random() * effects.length)];

        setShoeAnimations(prev => [...prev, {
            id: performance.now(),
            x: pos.x,
            y: pos.y,
            size: shoeSize,
            rotation,
            createdAt: performance.now(),
            effectType,
        }]);

        playThudSound();
        setHitCount(prev => prev + 1);
    }
  };
  
  const handleInteractionStart = useCallback((pos: { x: number; y: number; absoluteX: number; absoluteY: number; } | null) => {
    if (!pos || !imageSrc || isLoading) return;

    if (credits <= 0) {
        setError(user ? t('errors.no_credits_user') : t('errors.no_credits_guest'));
        return;
    }

    let canHit = false;
    if (faceBox) {
        if (pos.x >= faceBox.x && pos.x <= faceBox.x + faceBox.width && pos.y >= faceBox.y && pos.y <= faceBox.y + faceBox.height) {
            canHit = true;
        }
    } else {
        canHit = true; 
    }
    
    if (!canHit) return;
    
    setCredits(prev => Math.max(0, prev - 1));
    logToolUse(activeTool);
    
    isDraggingRef.current = true;

    if (activeTool === 'tornado') {
        applyTornadoEffect(pos.absoluteX, pos.absoluteY);
    } else if (activeTool === 'burn') {
        if (burnIntervalRef.current) clearInterval(burnIntervalRef.current);

        const offscreenCanvas = offscreenCanvasRef.current;
        if (!offscreenCanvas) return;
        const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
        if (!offscreenCtx) return;

        const imageX = Math.floor(pos.x * offscreenCanvas.width);
        const imageY = Math.floor(pos.y * offscreenCanvas.height);
        const pixelData = offscreenCtx.getImageData(imageX, imageY, 1, 1).data;
        const baseColor = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };

        setHitCount(prev => prev + 1);
        playBurnSound();
        
        const minRadiusFactor = 0.015;
        const maxRadiusFactor = 0.12;
        const radius = minRadiusFactor + (strength / 100) * (maxRadiusFactor - minRadiusFactor);
        
        const shapePoints: { angle: number, radius: number }[] = [];
        const pointCount = 12;
        for (let i = 0; i < pointCount; i++) {
            const angle = (i / pointCount) * Math.PI * 2;
            const radiusMultiplier = 0.7 + Math.random() * 0.6;
            shapePoints.push({ angle, radius: radiusMultiplier });
        }

        const newBurn: Burn = {
            id: performance.now(),
            x: pos.x, y: pos.y,
            radius, intensity: 0.2,
            createdAt: performance.now(),
            baseColor,
            shapePoints,
        };
        
        setBurns(prev => [...prev, newBurn]);
        activeBurnIdRef.current = newBurn.id;
        lastBurnPositionRef.current = pos;

        burnIntervalRef.current = window.setInterval(() => {
            setBurns(currentBurns => {
                const activeBurn = currentBurns.find(b => b.id === activeBurnIdRef.current);
                if (!activeBurn) return currentBurns;
                
                return currentBurns.map(b => 
                    b.id === activeBurnIdRef.current
                        ? { ...b, intensity: Math.min(1.2, b.intensity + 0.05) }
                        : b
                );
            });

            if (currentMousePosRef.current && Math.random() > 0.3) {
                const particleCount = 2;
                for (let i = 0; i < particleCount; i++) {
                    setFlameParticles(prev => [...prev, {
                        id: performance.now() + i,
                        x: currentMousePosRef.current!.absoluteX + (Math.random() - 0.5) * 10,
                        y: currentMousePosRef.current!.absoluteY + (Math.random() - 0.5) * 10,
                        size: (10 + Math.random() * 15) * (strength / 100 + 0.5),
                        life: 20 + Math.random() * 15,
                        maxLife: 20 + Math.random() * 15,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: -2 - Math.random() * 2.5,
                    }]);
                }
            }
        }, 50);
    } else {
        applyToolEffect(pos);
    }
  }, [imageSrc, isLoading, credits, user, faceBox, activeTool, strength, t, logToolUse, applyTornadoEffect, playBurnSound]);

  const handleInteractionMove = useCallback((pos: { x: number; y: number; absoluteX: number; absoluteY: number; } | null) => {
    if (pos) {
        currentMousePosRef.current = pos;
    } else {
        currentMousePosRef.current = null;
    }
    
    if (!pos) {
      setIsHoveringFace(false);
      return;
    }

    if (isDraggingRef.current && credits > 0) {
      if (activeTool === 'tornado') {
        applyTornadoEffect(pos.absoluteX, pos.absoluteY);
      } else if (activeTool === 'burn' && lastBurnPositionRef.current) {
          const lastPos = lastBurnPositionRef.current;
          const dx = pos.x - lastPos.x;
          const dy = pos.y - lastPos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          const minRadiusFactor = 0.015;
          const maxRadiusFactor = 0.12;
          const radius = minRadiusFactor + (strength / 100) * (maxRadiusFactor - minRadiusFactor);
          
          if (dist > radius * 0.25) {
              const offscreenCanvas = offscreenCanvasRef.current;
              if (!offscreenCanvas) return;
              const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
              if (!offscreenCtx) return;

              const imageX = Math.floor(pos.x * offscreenCanvas.width);
              const imageY = Math.floor(pos.y * offscreenCanvas.height);
              const pixelData = offscreenCtx.getImageData(imageX, imageY, 1, 1).data;
              const baseColor = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };
              
              const shapePoints: { angle: number, radius: number }[] = [];
              const pointCount = 12;
              for (let i = 0; i < pointCount; i++) {
                  const angle = (i / pointCount) * Math.PI * 2;
                  const radiusMultiplier = 0.7 + Math.random() * 0.6;
                  shapePoints.push({ angle, radius: radiusMultiplier });
              }

              const newBurn: Burn = {
                  id: performance.now(),
                  x: pos.x, y: pos.y,
                  radius, intensity: 0.2,
                  createdAt: performance.now(),
                  baseColor,
                  shapePoints,
              };
              setBurns(prev => [...prev, newBurn]);
              activeBurnIdRef.current = newBurn.id;
              lastBurnPositionRef.current = pos;
          }
      }
    }

    if (activeTool === 'mallet') {
        if (faceBox || !isLoading) {
            let isHovering = false;
            if (faceBox) {
                const { x, y } = pos;
                const { x: faceX, y: faceY, width: faceW, height: faceH } = faceBox;
                isHovering = (x >= faceX && x <= faceX + faceW && y >= faceY && y <= faceY + faceH);
            } else {
                isHovering = true;
            }
            setIsHoveringFace(isHovering);
        } else {
            setIsHoveringFace(false);
        }
    } else {
        setIsHoveringFace(false);
    }
  }, [credits, activeTool, faceBox, isLoading, strength, applyTornadoEffect]);
  
  const handleInteractionEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (burnIntervalRef.current) {
        clearInterval(burnIntervalRef.current);
        burnIntervalRef.current = null;
    }
    activeBurnIdRef.current = null;
    lastBurnPositionRef.current = null;
    stopBurnSound();
  }, [stopBurnSound]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pos = getPosOnImage(event.clientX, event.clientY);
    handleInteractionStart(pos);
  }, [getPosOnImage, handleInteractionStart]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const currentMousePos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setMousePosition(currentMousePos);
    
    const pos = getPosOnImage(event.clientX, event.clientY);
    handleInteractionMove(pos);
  }, [getPosOnImage, handleInteractionMove]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.touches.length === 0) return;
    const touch = event.touches[0];
    const pos = getPosOnImage(touch.clientX, touch.clientY);
    handleInteractionStart(pos);
  }, [getPosOnImage, handleInteractionStart]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.touches.length === 0) return;
    const touch = event.touches[0];
    const pos = getPosOnImage(touch.clientX, touch.clientY);
    handleInteractionMove(pos);
  }, [getPosOnImage, handleInteractionMove]);

  const triggerFileInput = () => fileInputRef.current?.click();
  
  const getCursor = () => {
      if (!imageSrc) return 'default';
      if (credits <= 0) return 'not-allowed';
      if (activeTool === 'mallet' && isHoveringFace) return 'none';
      if (activeTool === 'burn') return 'none';
      if (['voodooSpider', 'voodooNeedle', 'fistPunch', 'classic', 'phlegm'].includes(activeTool)) return 'crosshair';
      if (activeTool === 'tornado') return isDraggingRef.current ? 'grabbing' : 'grab';
      if (activeTool === 'hand') return 'grab';
      return 'default';
  }

  const handleExportImage = useCallback(() => {
    const sourceCanvas = offscreenCanvasRef.current;
    if (!sourceCanvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw base image with destructive effects
    ctx.drawImage(sourceCanvas, 0, 0);

    const finalWidth = exportCanvas.width;
    const finalHeight = exportCanvas.height;
    const offsetX = 0;
    const offsetY = 0;

    // 2. Draw all permanent, non-destructive effects
    
    // Dents
    dents.forEach(dent => {
      const centerX = offsetX + dent.x * finalWidth;
      const centerY = offsetY + dent.y * finalHeight;
      const radius = dent.radius * Math.min(finalWidth, finalHeight);
      
      const shadowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGradient.addColorStop(0.7, dent.shadowColor.replace(/[\d\.]+\)$/, '0.3)'));
      shadowGradient.addColorStop(1, dent.shadowColor.replace(/[\d\.]+\)$/, '0.7)'));
      ctx.fillStyle = shadowGradient;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, radius * 0.8, dent.rotation, 0, Math.PI * 2);
      ctx.fill();

      const highlightGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
      highlightGradient.addColorStop(0, dent.highlightColor);
      highlightGradient.addColorStop(1, dent.highlightColor.replace(/[\d\.]+\)$/, '0)'));
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 0.8, radius, dent.rotation, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Burns
    burns.forEach(burn => {
        const centerX = offsetX + burn.x * finalWidth;
        const centerY = offsetY + burn.y * finalHeight;
        const baseRadius = burn.radius * Math.min(finalWidth, finalHeight);
        const intensity = Math.min(1.2, burn.intensity);

        const drawIrregularPath = (c: CanvasRenderingContext2D, radius: number) => {
            c.beginPath();
            const points = burn.shapePoints.map(p => ({
                x: centerX + Math.cos(p.angle) * radius * p.radius,
                y: centerY + Math.sin(p.angle) * radius * p.radius,
            }));
            c.moveTo((points[0].x + points[points.length - 1].x) / 2, (points[0].y + points[points.length - 1].y) / 2);
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                c.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            }
            c.closePath();
        };
        
        ctx.save();
        const { r, g, b } = burn.baseColor;
        const irritationColor = `rgba(${Math.min(255, r + 80)}, ${g}, ${b}, ${0.5 * intensity})`;
        ctx.globalCompositeOperation = 'soft-light';
        const irritationGrad = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, baseRadius * 1.8);
        irritationGrad.addColorStop(0, irritationColor);
        irritationGrad.addColorStop(1, `rgba(${r + 50}, ${g}, ${b}, 0)`);
        ctx.fillStyle = irritationGrad;
        drawIrregularPath(ctx, baseRadius * 1.8);
        ctx.fill();
        
        ctx.globalCompositeOperation = 'color-burn';
        const scorchColor = `rgba(90, 45, 15, ${0.8 * intensity})`;
        const scorchGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
        scorchGrad.addColorStop(0, scorchColor);
        scorchGrad.addColorStop(1, 'rgba(50, 20, 10, 0)');
        ctx.fillStyle = scorchGrad;
        drawIrregularPath(ctx, baseRadius);
        ctx.fill();

        ctx.globalCompositeOperation = 'multiply';
        const charColor = `rgba(80, 40, 30, ${0.7 * intensity})`;
        const charGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 0.6);
        charGrad.addColorStop(0, charColor);
        charGrad.addColorStop(1, 'rgba(30, 0, 0, 0)');
        ctx.fillStyle = charGrad;
        drawIrregularPath(ctx, baseRadius * 0.6);
        ctx.fill();
        ctx.restore();
    });

    // Spiders
    spiders.forEach(spider => {
      const cx = offsetX + spider.x * finalWidth;
      const cy = offsetY + spider.y * finalHeight;
      const size = spider.size * Math.min(finalWidth, finalHeight);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spider.rotation + Math.PI / 2);
      drawSpider(ctx, size);
      ctx.restore();
    });
    
    // Needles
    needles.forEach(needle => {
        const cx = offsetX + needle.x * finalWidth;
        const cy = offsetY + needle.y * finalHeight;
        const length = needle.length * Math.min(finalWidth, finalHeight);
        const headRadius = 4.5; const shaftWidth = 2;
        ctx.fillStyle = 'rgba(10, 0, 0, 0.6)'; ctx.beginPath(); ctx.arc(cx, cy, shaftWidth / 1.5, 0, Math.PI * 2); ctx.fill();
        const woundGradient = ctx.createRadialGradient(cx, cy, shaftWidth, cx, cy, headRadius * 2.5);
        woundGradient.addColorStop(0, 'rgba(150, 50, 50, 0.4)'); woundGradient.addColorStop(0.7, 'rgba(100, 30, 30, 0.2)'); woundGradient.addColorStop(1, 'rgba(100, 30, 30, 0)');
        ctx.fillStyle = woundGradient; ctx.beginPath(); ctx.arc(cx, cy, headRadius * 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(needle.rotation);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 5; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
        const shaftGradient = ctx.createLinearGradient(-shaftWidth, 0, shaftWidth, 0);
        shaftGradient.addColorStop(0, '#71717a'); shaftGradient.addColorStop(0.4, '#e5e5e5'); shaftGradient.addColorStop(1, '#a1a1aa');
        ctx.strokeStyle = shaftGradient; ctx.lineWidth = shaftWidth; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -length); ctx.stroke();
        ctx.fillStyle = needle.color; ctx.beginPath(); ctx.arc(0, -length, headRadius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = 'transparent';
        const gradient = ctx.createRadialGradient(-headRadius * 0.4, -length - headRadius * 0.4, 0, -headRadius * 0.4, -length - headRadius * 0.4, headRadius * 1.5);
        gradient.addColorStop(0, 'rgba(255,255,255,0.9)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, -length, headRadius, 0, 2 * Math.PI); ctx.fill();
        ctx.restore();
    });

    // Bruises
    bruises.forEach(bruise => {
      const centerX = offsetX + bruise.x * finalWidth;
      const centerY = offsetY + bruise.y * finalHeight;
      const radiusX = bruise.radius * bruise.aspectRatio * Math.min(finalWidth, finalHeight);
      const radiusY = bruise.radius * Math.min(finalWidth, finalHeight);
      const intensity = bruise.intensity;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const irritationRadius = Math.max(radiusX, radiusY) * 2.5;
      const irritationGradient = ctx.createRadialGradient( centerX, centerY, 0, centerX, centerY, irritationRadius );
      irritationGradient.addColorStop(0, `rgba(220, 80, 80, ${0.35 * intensity})`); irritationGradient.addColorStop(0.5, `rgba(200, 100, 100, ${0.2 * intensity})`); irritationGradient.addColorStop(1, 'rgba(200, 100, 100, 0)');
      ctx.fillStyle = irritationGradient; ctx.beginPath(); ctx.arc(centerX, centerY, irritationRadius, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(centerX, centerY, radiusX, radiusY, bruise.rotation, 0, 2 * Math.PI);
      ctx.globalCompositeOperation = 'multiply';
      const shadowGradient = ctx.createRadialGradient( centerX + radiusX * 0.3, centerY + radiusY * 0.3, 0, centerX, centerY, Math.max(radiusX, radiusY) * 1.5 );
      shadowGradient.addColorStop(0, 'rgba(100, 40, 40, 0)'); shadowGradient.addColorStop(1, `rgba(100, 40, 40, ${0.4 * intensity})`);
      ctx.fillStyle = shadowGradient; ctx.fill();
      ctx.globalCompositeOperation = 'soft-light';
      const bodyGradient = ctx.createRadialGradient( centerX - radiusX * 0.3, centerY - radiusY * 0.3, 0, centerX, centerY, Math.max(radiusX, radiusY) );
      bodyGradient.addColorStop(0, `rgba(255, 250, 220, ${0.9 * intensity})`); bodyGradient.addColorStop(1, `rgba(255, 220, 200, ${0.6 * intensity})`);
      ctx.fillStyle = bodyGradient; ctx.fill();
      ctx.globalCompositeOperation = 'overlay';
      const highlightRadius = Math.max(radiusX, radiusY);
      const highlightGradient = ctx.createRadialGradient( centerX - radiusX * 0.4, centerY - radiusY * 0.4, 0, centerX - radiusX * 0.4, centerY - radiusY * 0.4, highlightRadius * 0.7 );
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`); highlightGradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.7 * intensity})`); highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient; ctx.fill();
      ctx.restore();
    });
    
    // Swellings
    swellings.forEach(swell => {
      const currentIntensity = swell.intensity;
      const centerX = offsetX + swell.x * finalWidth;
      const centerY = offsetY + swell.y * finalHeight;
      const radiusX = swell.radius * swell.aspectRatio * Math.min(finalWidth, finalHeight);
      const radiusY = swell.radius * Math.min(finalWidth, finalHeight);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const baseRadius = Math.max(radiusX, radiusY) * 1.8;
      const grad1 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
      grad1.addColorStop(0.2, `rgba(200, 40, 40, ${0.5 * currentIntensity})`);
      grad1.addColorStop(1, `rgba(200, 40, 40, 0)`);
      ctx.fillStyle = grad1; ctx.beginPath(); ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'soft-light';
      const grad2 = ctx.createRadialGradient( centerX - radiusX * 0.2, centerY - radiusY * 0.2, 0, centerX, centerY, Math.max(radiusX, radiusY) * 1.2 );
      grad2.addColorStop(0, `rgba(255, 200, 200, ${0.6 * currentIntensity})`);
      grad2.addColorStop(1, `rgba(255, 200, 200, 0)`);
      ctx.fillStyle = grad2; ctx.beginPath(); ctx.ellipse(centerX, centerY, radiusX, radiusY, swell.rotation, 0, 2 * Math.PI); ctx.fill();
      ctx.globalCompositeOperation = 'color-burn';
      const grad3 = ctx.createRadialGradient( centerX, centerY, 0, centerX, centerY, Math.max(radiusX, radiusY) );
      grad3.addColorStop(0, `rgba(150, 0, 0, ${0.4 * currentIntensity})`);
      grad3.addColorStop(0.8, `rgba(150, 0, 0, 0)`);
      ctx.fillStyle = grad3; ctx.beginPath(); ctx.ellipse(centerX, centerY, radiusX, radiusY, swell.rotation, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
    });
    
    // Phlegms
    phlegms.forEach(p => {
        const centerX = offsetX + p.x * finalWidth;
        const centerY = offsetY + p.y * finalHeight;
        const radiusX = p.size * Math.min(finalWidth, finalHeight);
        const radiusY = radiusX * 0.8;
        const { r, g, b } = p.baseColor;
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const bodyGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusX * 1.2);
        bodyGrad.addColorStop(0, `rgba(${(r + 250) / 2}, ${(g + 255) / 2}, ${(b + 250) / 2}, 0.12)`);
        bodyGrad.addColorStop(0.7, `rgba(${(r + 240) / 2}, ${(g + 250) / 2}, ${(b + 245) / 2}, 0.08)`);
        bodyGrad.addColorStop(1, `rgba(${(r + 200) / 2}, ${(g + 220) / 2}, ${(b + 210) / 2}, 0)`);
        ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.ellipse(centerX, centerY, radiusX, radiusY, p.rotation, 0, 2 * Math.PI); ctx.fill();
        ctx.globalCompositeOperation = 'multiply';
        const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusX * 0.8);
        coreGrad.addColorStop(0, `rgba(${r * 0.95}, ${g * 0.95}, ${b * 0.95}, 0.03)`);
        coreGrad.addColorStop(1, `rgba(${r * 0.8}, ${g * 0.8}, ${b * 0.8}, 0)`);
        ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.ellipse(centerX, centerY, radiusX * 0.8, radiusY * 0.8, p.rotation, 0, 2 * Math.PI); ctx.fill();
        ctx.globalCompositeOperation = 'soft-light';
        const highlightRadius = radiusX * 0.6;
        const highlightX = centerX - radiusX * 0.3;
        const highlightY = centerY - radiusY * 0.3;
        const highlightGrad = ctx.createRadialGradient( highlightX, highlightY, 0, highlightX, highlightY, highlightRadius );
        highlightGrad.addColorStop(0, `rgba(255, 255, 255, 0.9)`); highlightGrad.addColorStop(0.5, `rgba(255, 255, 255, 0.75)`); highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGrad; ctx.beginPath(); ctx.ellipse(centerX, centerY, radiusX, radiusY, p.rotation, 0, 2 * Math.PI); ctx.fill();
        ctx.restore();
    });

    // 3. Trigger download
    const link = document.createElement('a');
    link.download = 'poppet-punch.png';
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }, [dents, spiders, needles, bruises, swellings, phlegms, burns]);

  const ToolButton: React.FC<{tool: typeof tools[0]}> = ({ tool }) => {
    const isActive = activeTool === tool.id;
    const isDisabled = credits <= 0 && !!imageSrc;
    return (
        <button
            onClick={() => setActiveTool(tool.id as ToolId)}
            disabled={isDisabled}
            className={`w-24 h-24 flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-yellow-500 text-slate-900 shadow-lg scale-105' : 'bg-slate-700/50'
            } ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600/50'
            }`}
            aria-label={tool.name}
        >
            <tool.icon className="w-8 h-8 mb-1" />
            <span className="text-xs text-center font-semibold">{tool.name}</span>
        </button>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/40 via-slate-900 to-black text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6 text-yellow-300">
            <h1 className="text-2xl sm:text-3xl font-bold">打小人! Poppet Punch!</h1>
            <div className="flex items-center gap-4">
                <div className="bg-black/30 px-4 py-2 rounded-full flex items-center gap-2 text-lg">
                    <CoinIcon className="w-6 h-6"/>
                    <span className="font-bold">{credits}</span>
                    <span className="hidden sm:inline">{t('header.credit')}</span>
                </div>
              {user ? (
                <>
                   <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-500 transition-colors duration-300 shadow-lg">
                    <LogoutIcon className="w-5 h-5" />
                    {t('header.logout')}
                  </button>
                </>
              ) : (
                <button onClick={openAuthModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors duration-300 shadow-lg">
                  <UserIcon className="w-5 h-5" />
                  {t('header.login_signup')}
                </button>
              )}
              <LanguageSelector />
            </div>
        </header>
        
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-black/20 rounded-2xl shadow-lg p-2 sm:p-4 flex flex-col items-center justify-center min-h-[60vh] lg:min-h-[75vh]">
                {isCameraOpen ? (
                     <div className="relative w-full h-full flex flex-col items-center justify-center bg-black rounded-lg">
                        <video 
                            ref={videoRef} 
                            playsInline
                            autoPlay
                            muted
                            className="w-full h-full object-contain rounded-lg transform scale-x-[-1]"
                        />
                        <div className="absolute bottom-4 sm:bottom-6 flex flex-col sm:flex-row items-center gap-4 z-10">
                            <button 
                                onClick={handleCapture} 
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-700 text-white font-bold rounded-full hover:bg-red-600 transition-colors duration-300 shadow-lg text-lg"
                                aria-label={t('camera.capture')}
                            >
                                <CameraIcon className="w-8 h-8" />
                                <span>{t('camera.capture')}</span>
                            </button>
                            <button 
                                onClick={handleCloseCamera} 
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600/80 text-white font-bold rounded-full hover:bg-slate-500/80 transition-colors duration-300 shadow-lg text-sm"
                            >
                                {t('camera.cancel')}
                            </button>
                        </div>
                    </div>
                ) : !imageSrc ? (
                    <div className="text-center p-4">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-slate-100">{t('upload.title')}</h2>
                        <p className="text-slate-400 mb-8 max-w-md">{t('upload.subtitle')}</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
                            <button onClick={triggerFileInput} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-500 transition-colors duration-300 shadow-lg">
                                <UploadIcon className="w-6 h-6" />
                                {t('upload.button')}
                            </button>
                            <button onClick={handleOpenCamera} className="flex items-center justify-center gap-2 px-6 py-3 bg-red-700 text-white font-bold rounded-lg hover:bg-red-600 transition-colors duration-300 shadow-lg">
                                <CameraIcon className="w-6 h-6" />
                                {t('camera.button')}
                            </button>
                        </div>
                         <div className="mt-8 bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg flex items-center gap-3 justify-center">
                            <span className="text-2xl">✔</span>
                            <p>{t('upload.mallet_ready')}</p>
                        </div>
                         {error && <div className="mt-4 text-center text-red-400 bg-red-900/50 px-4 py-2 rounded-md z-10 break-words">{error}</div>}
                    </div>
                ) : (
                    <div 
                      className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900/50"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleInteractionEnd}
                      onMouseLeave={handleInteractionEnd}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleInteractionEnd}
                      onTouchCancel={handleInteractionEnd}
                      style={{ cursor: getCursor() }}
                    >
                        <img ref={imageRef} src={imageSrc} alt="Uploaded" className="w-full h-full object-contain block opacity-0 pointer-events-none" />
                        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
                        <AnimatedMalletCursor position={mousePosition} visible={isHoveringFace} />
                        <BurnCursor position={mousePosition} visible={!!imageSrc && activeTool === 'burn'} />
                        
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                                <SpinnerIcon className="w-12 h-12 text-yellow-400" />
                                <p className="mt-4 text-lg font-semibold animate-pulse">
                                  {t('ai.face_detection_inprogress')}
                                </p>
                            </div>
                        )}
                        {warning && !error && (
                            <div className="absolute bottom-4 left-4 right-4 text-center text-yellow-300 bg-yellow-900/50 px-4 py-2 rounded-md z-10 break-words">
                                {warning}
                            </div>
                        )}
                        {error && <div className="absolute bottom-4 left-4 right-4 text-center text-red-400 bg-red-900/50 px-4 py-2 rounded-md z-10 break-words">{error}</div>}
                    </div>
                )}
            </div>

            <aside className="bg-black/30 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col gap-6">
                <div id="toolbox">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold">{t('toolbox.title')}</h3>
                        <div className="flex items-center gap-1 text-yellow-400">
                            <CoinIcon className="w-5 h-5"/>
                            <span className="font-bold">{credits}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {tools.map(tool => <ToolButton key={tool.id} tool={tool} />)}
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-3">{t('toolbox.unlock_message')}</p>
                </div>

                <div id="strength-slider" className="bg-slate-800/40 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <label htmlFor="strength" className="font-bold text-slate-300">{t('strength.label')}</label>
                        <span className="font-bold text-yellow-400 text-base">{strength}</span>
                    </div>
                    <input
                        id="strength"
                        type="range"
                        min="1"
                        max="100"
                        value={strength}
                        onChange={(e) => setStrength(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <button 
                        onClick={resetEffects}
                        disabled={dents.length === 0 && shoeAnimations.length === 0 && spiders.length === 0 && needles.length === 0 && bruises.length === 0 && swellings.length === 0 && burns.length === 0 && smoke.length === 0 && phlegms.length === 0 && !hasDestructiveChanges}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-500 transition-colors duration-300 shadow-lg disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        <BroomIcon className="w-5 h-5" />
                        {t('reset_effects.button')}
                    </button>
                    <button
                        onClick={handleExportImage}
                        disabled={!imageSrc || (hitCount === 0 && !hasDestructiveChanges)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors duration-300 shadow-lg disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        {t('export.button')}
                    </button>
                </div>


                <div id="progress-stats" className="bg-slate-800/40 p-4 rounded-lg">
                    <h3 className="text-xl font-bold mb-3">{t('progress.title')}</h3>
                    <div className="text-center mb-3">
                        <p className="text-5xl font-bold text-yellow-300">{hitCount}</p>
                        <p className="text-slate-400 text-sm">{t('progress.hits_label')}</p>
                    </div>
                    <div className="w-full">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>{t('progress.progress_label')}</span>
                            <span>{hitCount > 0 ? 1 : 0}/1</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                            <div className="bg-yellow-500 h-2.5 rounded-full" style={{width: `${hitCount > 0 ? 100 : 0}%`}}></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{t('progress.milestone_label')}: {t('progress.milestone_first')}</p>
                    </div>
                </div>

                
                
                <div className="mt-auto flex flex-col gap-2">
                    <button onClick={resetState} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-800 text-white font-bold rounded-lg hover:bg-red-700 transition-colors duration-300 shadow-lg">
                        <RestartIcon className="w-6 h-6" />
                        {t('restart.button')}
                    </button>
                </div>
            </aside>
        </main>
      </div>
      {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}
    </div>
  );
};

export default App;
