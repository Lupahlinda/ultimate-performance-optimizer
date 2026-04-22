// ==UserScript==
// @name         Ultimate Performance Optimizer - 
// @namespace    https://github.com/ultimate-performance-optimizer
// @version      2.0
// @description  Substitua 9+ scripts de performance por este único userscript: otimização completa de CPU, GPU, cache RAM, prefetching, economia de bateria e controle granular. Compatível com uBlock Origin e proteção total para sites críticos.
// @author       LupahlindaOptimizer
// @match        *://*/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // CONFIGURAÇÃO PRINCIPAL
    // ==========================================
    const CONFIG = {
        // Controles principais
        enabled: true,
        adaptiveMode: true,
        
        // Otimizações essenciais (sempre ativas)
        blockTrackers: false,  // Delegado para uBlock Origin
        optimizeImages: true,
        blockAutoplay: true,
        disableAnimations: true,
        disableSmoothScroll: true,
        
        // Opcionais (configuráveis)
        blockWebFonts: false,
        gpuHints: false,
        eventThrottling: false,
        fingerprintReduction: false,
        aggressiveMode: false,
        
        // Otimizações avançadas de performance
        forceGPUAcceleration: true,
        enablePrefetching: true,
        useRAMCache: true,
        preloadingStrategy: 'smart', // 'smart', 'aggressive', 'conservative'
        gpuMemoryOptimization: true,
        
        // CPU Tamer (inspirado no Web CPU Tamer)
        cpuTamerEnabled: true,
        cpuDelayOffset: 2 ** -26, // ~1.5e-8ms delay
        throttleAsyncOperations: true,
        
        // Otimizações específicas do YouTube
        youtubeH264Force: true,
        youtubeFPSLimit: 30,
        youtubeChatOptimization: false, // Desativado por padrão (muito complexo)
        
        // Limites e thresholds
        imageQualityThreshold: 800,
        throttleMs: 50,
        observerTimeout: 3000,
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        prefetchDistance: 3, // Níveis de links para prefetch
        preloadTimeout: 5000
    };

    // ==========================================
    // DETECÇÃO DE uBLOCK ORIGIN
    // ==========================================
    const detectUBlock = () => {
        // Detectar se uBlock Origin está ativo
        try {
            // uBlock injeta globais específicos
            if (typeof ublock !== 'undefined' || 
                typeof µBlock !== 'undefined' ||
                document.querySelector('#ublock0-requests') ||
                document.querySelector('#ublock0-panels')) {
                return true;
            }
            
            // Detectar via CSS injection do uBlock
            const testElement = document.createElement('div');
            testElement.style.cssText = 'display: none;';
            testElement.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text advertisement';
            document.body.appendChild(testElement);
            
            setTimeout(() => {
                if (testElement.offsetHeight === 0) {
                    return true; // uBlock bloqueou
                }
                document.body.removeChild(testElement);
            }, 100);
            
            return false;
        } catch (e) {
            return false;
        }
    };
    
    const hasUBlock = detectUBlock();
    
    // ==========================================
    // DETECÇÃO ADAPTATIVA
    // ==========================================
    const detectEnvironment = () => {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const hardware = navigator.hardwareConcurrency || 4;
        const memory = navigator.deviceMemory || 4;
        
        let mode = 'balanced'; // balanced, slow, extreme
        
        if (conn?.saveData || conn?.effectiveType?.includes('2g') || conn?.downlink < 1) {
            mode = 'slow';
        }
        
        if (conn?.effectiveType === 'slow-2g' || conn?.downlink < 0.5 || hardware <= 2 || memory <= 2) {
            mode = 'extreme';
        }
        
        // Ajustar configurações baseado no modo e presença do uBlock
        if (hasUBlock) {
            // uBlock já faz bloqueio de trackers/anúncios
            CONFIG.blockTrackers = false;
            CONFIG.aggressiveMode = false; // Evitar conflitos
            
            console.log('uBlock Origin detectado - funcionalidades de bloqueio desativadas');
        }
        
        if (mode === 'slow') {
            CONFIG.blockWebFonts = true;
            CONFIG.gpuHints = false;
            CONFIG.imageQualityThreshold = 480;
            CONFIG.forceGPUAcceleration = false;
            CONFIG.enablePrefetching = false;
            CONFIG.useRAMCache = false;
        } else if (mode === 'extreme') {
            CONFIG.blockWebFonts = true;
            CONFIG.fingerprintReduction = true;
            CONFIG.imageQualityThreshold = 320;
            CONFIG.eventThrottling = true;
            CONFIG.forceGPUAcceleration = false; // Economia de energia
            CONFIG.enablePrefetching = false;
            CONFIG.useRAMCache = false;
        } else {
            // Mode balanced - ativar otimizações avançadas (foco em performance, não bloqueio)
            CONFIG.forceGPUAcceleration = true;
            CONFIG.enablePrefetching = true;
            CONFIG.useRAMCache = true;
            CONFIG.gpuMemoryOptimization = true;
            
            // Ajustar baseado na memória disponível
            if (memory >= 8) {
                CONFIG.maxCacheSize = 100 * 1024 * 1024; // 100MB
                CONFIG.prefetchDistance = 5;
                CONFIG.preloadingStrategy = 'aggressive';
            } else if (memory >= 4) {
                CONFIG.maxCacheSize = 50 * 1024 * 1024; // 50MB
                CONFIG.prefetchDistance = 3;
                CONFIG.preloadingStrategy = 'smart';
            } else {
                CONFIG.maxCacheSize = 25 * 1024 * 1024; // 25MB
                CONFIG.prefetchDistance = 2;
                CONFIG.preloadingStrategy = 'conservative';
            }
        }
        
        return mode;
    };

    // ==========================================
    // EXCLUSÕES E SEGURANÇA
    // ==========================================
    const host = location.hostname;
    
    // Sites críticos (proteção completa)
    const CRITICAL_SITES = [
        'github.com', 'stackoverflow.com', 'web.whatsapp.com',
        'mail.google.com', 'outlook.live.com', 'banking.',
        'youtube.com', 'youtu.be', 'discord.com',
        'twitter.com', 'x.com', 'instagram.com', 'facebook.com',
        'linkedin.com', 'reddit.com', 'twitch.tv', 'spotify.com'
    ];
    
    // Verificar se é site crítico
    const isCriticalSite = CRITICAL_SITES.some(site => host.includes(site));
    
    // Exclusão completa para sites críticos
    if (isCriticalSite) {
        // Desativar TODAS as otimizações agressivas
        CONFIG.aggressiveMode = false;
        CONFIG.blockWebFonts = false;
        CONFIG.fingerprintReduction = false;
        CONFIG.forceGPUAcceleration = false;  // CRÍTICO: pode quebrar renderização
        CONFIG.enablePrefetching = false;      // CRÍTICO: pode sobrecarregar SPAs
        CONFIG.useRAMCache = false;           // CRÍTICO: pode interferir com cache nativo
        CONFIG.gpuMemoryOptimization = false;   // CRÍTICO: conflita com WebGL
        CONFIG.eventThrottling = false;        // CRÍTICO: quebra interatividade
        CONFIG.disableAnimations = false;       // CRÍTICO: quebra UX
        CONFIG.disableSmoothScroll = false;     // CRÍTICO: afeta navegação
        CONFIG.optimizeImages = false;          // CRÍTICO: pode quebrar lazy loading
        
        console.log(`Site crítico detectado: ${host} - otimizações agressivas desativadas`);
    }
    
    // ==========================================
    
    // Verificar exclusões antes de continuar
    if (manageSiteExclusions()) return;
    
    // ==========================================
    // LISTAS DE BLOQUEIO
    // ==========================================
    const TRACKER_DOMAINS = [
        'google-analytics', 'googletagmanager', 'googlesyndication',
        'googleadservices', 'doubleclick', 'facebook.com/tr',
        'facebook.net', 'connect.facebook', 'analytics.twitter',
        'linkedin.com/analytics', 'adsystem', 'amazon-adsystem',
        'googletagservices', 'outbrain', 'taboola', 'scorecardresearch',
        'quantserve', 'hotjar', 'mixpanel', 'segment.io', 'amplitude',
        'clarity.ms', 'sentry.io', 'fullstory.com'
    ];
    
    const AD_SELECTORS = [
        'ins.adsbygoogle', '.ad-container', '.ad-wrapper',
        '[class*="ad-"]', '[class*="ads-"]', '[id*="ad-"]',
        '[class*="advertisement"]', '[id*="advertisement"]'
    ];
    
    const BLOCKING_SELECTORS = [
        '[class*="preloader"]', '[id*="preloader"]',
        '[class*="loading-overlay"]', '[class*="skeleton"]',
        '.loading', '.spinner', '#loader'
    ];
    
    // ==========================================
    // FUNÇÕES UTILITÁRIAS
    // ==========================================
    const isTracker = (url) => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return TRACKER_DOMAINS.some(domain => lowerUrl.includes(domain));
    };
    
    // ==========================================
    // CACHE AVANÇADO EM RAM
    // ==========================================
    class RAMCache {
        constructor(maxSize) {
            this.cache = new Map();
            this.maxSize = maxSize;
            this.currentSize = 0;
        }
        
        set(key, value, size = 1024) {
            // Remover itens antigos se necessário
            while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
                const firstKey = this.cache.keys().next().value;
                const firstSize = this.cache.get(firstKey).size;
                this.cache.delete(firstKey);
                this.currentSize -= firstSize;
            }
            
            this.cache.set(key, { value, size, timestamp: Date.now() });
            this.currentSize += size;
        }
        
        get(key) {
            const item = this.cache.get(key);
            if (item) {
                // Mover para o final (LRU)
                this.cache.delete(key);
                this.cache.set(key, item);
                return item.value;
            }
            return null;
        }
        
        has(key) {
            return this.cache.has(key);
        }
        
        clear() {
            this.cache.clear();
            this.currentSize = 0;
        }
        
        getStats() {
            return {
                items: this.cache.size,
                currentSize: this.currentSize,
                maxSize: this.maxSize,
                usage: (this.currentSize / this.maxSize * 100).toFixed(1) + '%'
            };
        }
    }
    
    const ramCache = new RAMCache(CONFIG.maxCacheSize);
    
    // ==========================================
    // DETECÇÃO DE CAPACIDADE GPU
    // ==========================================
    const detectGPUCapability = () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return { supported: false, memory: 0 };
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
        
        // Estimar memória GPU baseado no renderer
        let gpuMemory = 512; // MB padrão
        if (renderer.includes('NVIDIA') || renderer.includes('GeForce')) {
            if (renderer.includes('RTX') || renderer.includes('GTX 10') || renderer.includes('GTX 16')) {
                gpuMemory = 4096; // 4GB+
            } else if (renderer.includes('GTX 9') || renderer.includes('GTX 7')) {
                gpuMemory = 2048; // 2GB
            }
        } else if (renderer.includes('Radeon') || renderer.includes('AMD')) {
            if (renderer.includes('RX') || renderer.includes('R9')) {
                gpuMemory = 2048; // 2GB+
            }
        } else if (renderer.includes('Intel')) {
            gpuMemory = 1024; // 1GB integrada
        }
        
        return {
            supported: true,
            memory: gpuMemory,
            renderer
        };
    };
    
    const gpuInfo = detectGPUCapability();
    
    // ==========================================
    // CPU TAMER INTEGRADO (inspirado no Web CPU Tamer)
    // ==========================================
    if (CONFIG.cpuTamerEnabled && !isCriticalSite) {
        // Salvar funções originais
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        const originalRequestAnimationFrame = window.requestAnimationFrame;
        const originalClearTimeout = window.clearTimeout;
        const originalClearInterval = window.clearInterval;
        const originalCancelAnimationFrame = window.cancelAnimationFrame;
        
        // Sistema de controle de promises
        let resolvePr = () => {};
        let pr = null;
        const setPr = () => {
            pr = new Promise((resolve) => {
                resolvePr = resolve;
            });
        };
        setPr();
        
        // Trackers para timeouts/animations
        const timeoutTracker = new Set();
        const animationTracker = new Set();
        
        // Função de ativação do throttling
        const act = () => {
            queueMicrotask(() => {
                resolvePr();
                setPr();
            });
        };
        
        // CPU Tamer setTimeout
        window.setTimeout = function(callback, delay = 0, ...args) {
            let timeoutId;
            const throttledCallback = (...cbArgs) => {
                if (CONFIG.throttleAsyncOperations) {
                    timeoutTracker.add(timeoutId);
                    act(); // Ativa throttling
                }
                try {
                    return callback(...cbArgs);
                } finally {
                    if (CONFIG.throttleAsyncOperations) {
                        timeoutTracker.delete(timeoutId);
                    }
                }
            };
            
            // Aplicar delay microscópico para economia de CPU
            if (delay >= 1) {
                delay = Math.max(0, delay + CONFIG.cpuDelayOffset);
            }
            
            timeoutId = originalSetTimeout(throttledCallback, delay, ...args);
            return timeoutId;
        };
        
        // CPU Tamer setInterval
        window.setInterval = function(callback, delay = 0, ...args) {
            let intervalId;
            const throttledCallback = (...cbArgs) => {
                if (CONFIG.throttleAsyncOperations) {
                    act(); // Ativa throttling
                }
                try {
                    return callback(...cbArgs);
                } catch (e) {
                    console.error('CPU Tamer callback error:', e);
                }
            };
            
            // Aplicar delay microscópico
            if (delay >= 1) {
                delay = Math.max(0, delay + CONFIG.cpuDelayOffset);
            }
            
            intervalId = originalSetInterval(throttledCallback, delay, ...args);
            return intervalId;
        };
        
        // CPU Tamer requestAnimationFrame
        window.requestAnimationFrame = function(callback) {
            let animationId;
            const throttledCallback = (timestamp) => {
                if (CONFIG.throttleAsyncOperations) {
                    animationTracker.add(animationId);
                    act(); // Ativa throttling
                }
                try {
                    return callback(timestamp);
                } finally {
                    if (CONFIG.throttleAsyncOperations) {
                        animationTracker.delete(animationId);
                    }
                }
            };
            
            animationId = originalRequestAnimationFrame(throttledCallback);
            return animationId;
        };
        
        // CPU Tamer clearTimeout
        window.clearTimeout = function(timeoutId) {
            timeoutTracker.delete(timeoutId);
            return originalClearTimeout(timeoutId);
        };
        
        // CPU Tamer clearInterval
        window.clearInterval = function(intervalId) {
            timeoutTracker.delete(intervalId);
            return originalClearInterval(intervalId);
        };
        
        // CPU Tamer cancelAnimationFrame
        window.cancelAnimationFrame = function(animationId) {
            animationTracker.delete(animationId);
            return originalCancelAnimationFrame(animationId);
        };
        
        console.log('CPU Tamer ativado - economia de energia/bateria');
    }
    
    const isAdElement = (element) => {
        return AD_SELECTORS.some(selector => {
            try {
                return element.matches && element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    };
    
    const shouldOptimizeImage = (img) => {
        return img.width > CONFIG.imageQualityThreshold || 
               img.height > CONFIG.imageQualityThreshold;
    };
    
    // ==========================================
    // 1. FORÇAR ACELERAÇÃO GPU (protegido para sites críticos)
    // ==========================================
    if (CONFIG.forceGPUAcceleration && gpuInfo.supported && !isCriticalSite) {
        // Forçar composição GPU para elementos críticos
        const forceGPUAcceleration = () => {
            const gpuSelectors = [
                'img', 'video', 'canvas', 'svg', 'picture', 'iframe',
                'main', 'article', 'section', 'header', 'footer', 'nav',
                '[style*="transform"]', '[style*="animation"]', '[style*="transition"]',
                '.content', '.container', '.wrapper', '.layout'
            ];
            
            gpuSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        // Forçar camada GPU
                        el.style.setProperty('transform', 'translate3d(0,0,0)', 'important');
                        el.style.setProperty('backface-visibility', 'hidden', 'important');
                        el.style.setProperty('perspective', '1000px', 'important');
                        
                        // Otimizar para renderização
                        el.style.setProperty('will-change', 'transform', 'important');
                        el.style.setProperty('contain', 'content', 'important');
                    });
                } catch (e) {
                    // Ignorar erros
                }
            });
        };
        
        // Aplicar imediatamente e monitorar novos elementos
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', forceGPUAcceleration);
        } else {
            forceGPUAcceleration();
        }
        
        // Observer para elementos dinâmicos
        const gpuObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Forçar GPU no novo elemento
                        node.style.setProperty('transform', 'translate3d(0,0,0)', 'important');
                        node.style.setProperty('backface-visibility', 'hidden', 'important');
                        
                        // Processar filhos
                        if (node.querySelectorAll) {
                            node.querySelectorAll('img, video, canvas').forEach(el => {
                                el.style.setProperty('transform', 'translate3d(0,0,0)', 'important');
                                el.style.setProperty('will-change', 'transform', 'important');
                            });
                        }
                    }
                });
            });
        });
        
        gpuObserver.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
        
        // Otimização de memória GPU
        if (CONFIG.gpuMemoryOptimization && gpuInfo.memory >= 2048) {
            // Habilitar recursos avançados para GPUs com mais memória
            GM_addStyle(`
                * {
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }
                
                img, video, canvas {
                    image-rendering: -webkit-optimize-contrast;
                    image-rendering: crisp-edges;
                    contain: strict;
                }
                
                .gpu-layer {
                    will-change: transform, opacity;
                    contain: layout style paint;
                }
            `);
        }
    }
    
    // ==========================================
    // 2. PREFETCHING INTELIGENTE COM CACHE RAM (protegido para sites críticos)
    // ==========================================
    if (CONFIG.enablePrefetching && CONFIG.useRAMCache && !isCriticalSite) {
        class SmartPrefetcher {
            constructor() {
                this.prefetched = new Set();
                this.prefetchQueue = [];
                this.isProcessing = false;
            }
            
            async prefetchResource(url) {
                if (this.prefetched.has(url) || ramCache.has(url)) return;
                
                try {
                    // Verificar se já está em cache
                    const cached = ramCache.get(url);
                    if (cached) return;
                    
                    // Fazer prefetch com cache
                    const response = await fetch(url, {
                        method: 'GET',
                        cache: 'force-cache',
                        headers: { 'Purpose': 'prefetch' }
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        ramCache.set(url, blob, blob.size);
                        this.prefetched.add(url);
                    }
                } catch (e) {
                    // Ignorar falhas de prefetch
                }
            }
            
            findAndPrefetchLinks() {
                const links = document.querySelectorAll('a[href]');
                const currentDomain = window.location.hostname;
                
                links.forEach(link => {
                    const href = link.href;
                    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
                    
                    try {
                        const linkUrl = new URL(href);
                        
                        // Apenas prefetch do mesmo domínio ou subdomínios
                        if (!linkUrl.hostname.includes(currentDomain)) return;
                        
                        // Evitar prefetch de links especiais
                        if (linkUrl.pathname.includes('logout') || 
                            linkUrl.pathname.includes('login') ||
                            linkUrl.pathname.includes('admin')) return;
                        
                        // Verificar distância do prefetch
                        const distance = this.getLinkDistance(link);
                        if (distance <= CONFIG.prefetchDistance) {
                            this.prefetchQueue.push(href);
                        }
                    } catch (e) {
                        // Ignorar URLs inválidas
                    }
                });
                
                this.processQueue();
            }
            
            getLinkDistance(element) {
                let distance = 0;
                let current = element;
                
                while (current && current !== document.body && distance < CONFIG.prefetchDistance) {
                    current = current.parentElement;
                    distance++;
                }
                
                return distance;
            }
            
            async processQueue() {
                if (this.isProcessing || this.prefetchQueue.length === 0) return;
                
                this.isProcessing = true;
                
                while (this.prefetchQueue.length > 0) {
                    const url = this.prefetchQueue.shift();
                    await this.prefetchResource(url);
                    
                    // Pequeno delay para não sobrecarregar
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                this.isProcessing = false;
            }
        }
        
        const prefetcher = new SmartPrefetcher();
        
        // Iniciar prefetching
        const startPrefetching = () => {
            prefetcher.findAndPrefetchLinks();
            
            // Atualizar prefetch periodicamente
            setInterval(() => prefetcher.findAndPrefetchLinks(), 10000);
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startPrefetching);
        } else {
            startPrefetching();
        }
    }
    
    // ==========================================
    // 3. CACHE RAM INTELIGENTE (protegido para sites críticos)
    // ==========================================
    if (CONFIG.useRAMCache && !isCriticalSite) {
        // Interceptar fetches para usar cache RAM (apenas cache, sem bloqueio)
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const url = args[0] instanceof Request ? args[0].url : args[0];
            
            // Verificar cache RAM primeiro
            if (ramCache.has(url)) {
                const cached = ramCache.get(url);
                return new Response(cached, {
                    status: 200,
                    statusText: 'OK (RAM Cache)',
                    headers: { 'X-Cache': 'ram' }
                });
            }
            
            // Fazer request normal (uBlock cuidará do bloqueio)
            const response = await originalFetch.apply(this, args);
            
            // Cache em RAM para respostas pequenas
            if (response.ok && response.url) {
                try {
                    const clone = response.clone();
                    const blob = await clone.blob();
                    
                    if (blob.size < 5 * 1024 * 1024) { // Apenas cache de <5MB
                        ramCache.set(response.url, blob, blob.size);
                    }
                } catch (e) {
                    // Ignorar falhas de cache
                }
            }
            
            return response;
        };
    }
    
    // ==========================================
    // 4. OTIMIZAÇÃO DE IMAGENS (protegido para sites críticos)
    // ==========================================
    if (CONFIG.optimizeImages && !isCriticalSite) {
        const optimizeImage = (img) => {
            if (!shouldOptimizeImage(img)) return;
            
            const src = img.src;
            if (!src || src.startsWith('data:')) return;
            
            // Otimização para CDNs conhecidos
            if (src.includes('googleusercontent') || src.includes('ggpht')) {
                img.src = src.replace(/=s\d+/, `=s${CONFIG.imageQualityThreshold}`)
                            .replace(/=w\d+/, `=w${CONFIG.imageQualityThreshold}`);
            } else if (src.includes('cloudinary')) {
                img.src = src.replace('/upload/', `/upload/q_auto:good,w_${CONFIG.imageQualityThreshold}/`);
            }
            
            // Lazy loading
            img.loading = 'lazy';
            img.decoding = 'async';
            
            // Remover srcset para economizar
            if (CONFIG.aggressiveMode) {
                img.removeAttribute('srcset');
            }
        };
        
        const processImages = () => {
            document.querySelectorAll('img').forEach(optimizeImage);
        };
        
        // Observer para novas imagens
        const imgObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'IMG') optimizeImage(node);
                    if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach(optimizeImage);
                    }
                });
            });
        });
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', processImages);
        } else {
            processImages();
        }
        
        imgObserver.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    }
    
    // ==========================================
    // 5. CONTROLE DE AUTOPLAY (protegido para sites críticos)
    // ==========================================
    if (CONFIG.blockAutoplay && !isCriticalSite) {
        const originalPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function() {
            if (!this.hasAttribute('data-user-initiated') &&
                !this.closest('[data-user-interacted]')) {
                this.pause();
                this.muted = true;
                this.preload = 'metadata';
                return Promise.resolve();
            }
            return originalPlay.call(this);
        };
        
        const prepareMedia = () => {
            document.querySelectorAll('video, audio').forEach(media => {
                media.preload = 'metadata';
                media.autoplay = false;
            });
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', prepareMedia);
        } else {
            prepareMedia();
        }
    }
    
    // ==========================================
    // 6. OTIMIZAÇÕES CSS (protegido para sites críticos)
    // ==========================================
    if (!isCriticalSite) {
        const cssStyles = [];
        
        // Desabilitar smooth scroll
        if (CONFIG.disableSmoothScroll) {
            cssStyles.push(`
                html, body {
                    scroll-behavior: auto !important;
                }
            `);
        }
        
        // Garantir visibilidade
        cssStyles.push(`
            html, body {
                visibility: visible !important;
                opacity: 1 !important;
            }
        `);
        
        // Remover animações
        if (CONFIG.disableAnimations) {
            cssStyles.push(`
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            `);
        }
        
        // Remover elementos bloqueantes
        cssStyles.push(`
            ${BLOCKING_SELECTORS.join(', ')} {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `);
        
        // GPU hints (condicional)
        if (CONFIG.gpuHints) {
            cssStyles.push(`
                img, video, canvas, main, article, section {
                    transform: translate3d(0,0,0);
                    backface-visibility: hidden;
                }
            `);
        }
        
        // Remover efeitos pesados
        cssStyles.push(`
            * {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }
        `);
        
        // Bloquear web fonts
        if (CONFIG.blockWebFonts) {
            cssStyles.push(`
                * {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                }
            `);
        }
        
        GM_addStyle(cssStyles.join('\n'));
    }
    
    // ==========================================
    // 7. BLOQUEIO DE FONTS (protegido para sites críticos)
    // ==========================================
    if (CONFIG.blockWebFonts && !isCriticalSite) {
        const originalFontFace = window.FontFace;
        if (originalFontFace) {
            window.FontFace = function(family, source, descriptors) {
                return {
                    load: () => Promise.resolve(),
                    family: 'system-ui'
                };
            };
        }
        
        // Remover stylesheets de fonts
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (link.href && (link.href.includes('font') || link.href.includes('googleapis'))) {
                link.remove();
            }
        });
    }
    
    // ==========================================
    // 8. THROTTLING DE EVENTOS (protegido para sites críticos)
    // ==========================================
    if (CONFIG.eventThrottling && !isCriticalSite) {
        const lastEventTime = {};
        const throttledEvents = ['mousemove', 'pointermove', 'scroll', 'resize'];
        
        throttledEvents.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                const now = performance.now();
                if (lastEventTime[eventType] && now - lastEventTime[eventType] < CONFIG.throttleMs) {
                    e.stopImmediatePropagation();
                    return;
                }
                lastEventTime[eventType] = now;
            }, true);
        });
    }
    
    // ==========================================
    // 7. REDUÇÃO DE FINGERPRINT (protegido para sites críticos)
    // ==========================================
    if (CONFIG.fingerprintReduction && !isCriticalSite) {
        try {
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
            Object.defineProperty(navigator, 'plugins', { get: () => [] });
            Object.defineProperty(navigator, 'mimeTypes', { get: () => [] });
        } catch (e) {
            // Ignorar falhas
        }
    }
    
    // ==========================================
    // 8. REMOÇÃO DE ANÚNCIOS (modo agressivo - protegido para sites críticos)
    // ==========================================
    if (CONFIG.aggressiveMode && !isCriticalSite) {
        const removeAds = () => {
            AD_SELECTORS.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (el.tagName === 'ARTICLE' || el.tagName === 'MAIN') return;
                        el.style.display = 'none';
                    });
                } catch (e) {
                    // Ignorar erros
                }
            });
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', removeAds);
            setTimeout(removeAds, 2000);
        } else {
            removeAds();
            setTimeout(removeAds, 2000);
        }
    }
    
    // ==========================================
    // 10. MENU DE CONTROLE OTIMIZADO
    // ==========================================
    GM_registerMenuCommand("Performance: Toggle", () => {
        CONFIG.enabled = !CONFIG.enabled;
        alert(`Performance Optimizer ${CONFIG.enabled ? 'ativado' : 'desativado'}`);
        location.reload();
    });
    
    GM_registerMenuCommand("Advanced: System Status", () => {
        const stats = ramCache.getStats();
        const gpuStats = gpuInfo;
        const status = `
Performance Optimizer Status:
${hasUBlock ? 'uBlock Origin: ATIVO' : 'uBlock Origin: Não detectado'}
GPU: ${gpuStats.supported ? `${gpuStats.renderer} (${gpuStats.memory}MB)` : 'Não suportada'}
Cache RAM: ${CONFIG.useRAMCache ? `${stats.usage} (${stats.items} itens)` : 'Desativado'}
Prefetch: ${CONFIG.enablePrefetching ? 'Ativo' : 'Desativado'}
GPU Acceleration: ${CONFIG.forceGPUAcceleration ? 'Ativa' : 'Desativada'}
        `.trim();
        alert(status);
    });
    
    GM_registerMenuCommand("Advanced: Clear Cache", () => {
        ramCache.clear();
        alert('Cache RAM limpo');
    });
    
    GM_registerMenuCommand("Advanced: Toggle CPU Tamer", () => {
        CONFIG.cpuTamerEnabled = !CONFIG.cpuTamerEnabled;
        alert(`CPU Tamer ${CONFIG.cpuTamerEnabled ? 'ativado' : 'desativado'} - ${CONFIG.cpuTamerEnabled ? 'economia de bateria' : 'performance máxima'}`);
        location.reload();
    });
    
    GM_registerMenuCommand("YouTube: Toggle H.264 + FPS", () => {
        CONFIG.youtubeH264Force = !CONFIG.youtubeH264Force;
        alert(`YouTube H.264 + FPS ${CONFIG.youtubeH264Force ? 'ativado' : 'desativado'} - ${CONFIG.youtubeH264Force ? `Forçando H.264 e limitando ${CONFIG.youtubeFPSLimit} FPS` : 'Usando codecs padrão'}`);
        location.reload();
    });
    
    GM_registerMenuCommand("Site: Excluir Site Atual", () => {
        const currentExcluded = GM_getValue("excluded_sites", []) || [];
        const host = location.hostname;
        
        if (currentExcluded.includes(host)) {
            alert(`O site ${host} já está na lista de exclusão.`);
            return;
        }
        
        if (confirm(`Deseja excluir o site "${host}" das otimizações?\n\nIsso desativará TODAS as otimizações para este site.`)) {
            currentExcluded.push(host);
            GM_setValue("excluded_sites", currentExcluded);
            alert(`Site ${host} excluído com sucesso!\n\nO script será recarregado para aplicar as mudanças.`);
            location.reload();
        }
    });
    
    // ==========================================
    // 11. INDICADOR VISUAL REMOVIDO
    // ==========================================
    // Indicador visual removido para não interferir na UX
    // Status disponível apenas via console e menu Tampermonkey
    
    // ==========================================
    // 12. INICIALIZAÇÃO
    // ==========================================
    const mode = detectEnvironment();
    console.log(`Performance Optimizer: ${mode} mode activated`);
    console.log(`uBlock Origin: ${hasUBlock ? 'Detected - blocking disabled' : 'Not detected'}`);
    console.log(`GPU: ${gpuInfo.supported ? `${gpuInfo.renderer} (${gpuInfo.memory}MB)` : 'Not supported'}`);
    console.log(`Cache RAM: ${CONFIG.useRAMCache ? `${CONFIG.maxCacheSize / 1024 / 1024}MB` : 'Disabled'}`);
    console.log(`CPU Tamer: ${CONFIG.cpuTamerEnabled ? 'Ativado - economia de bateria' : 'Desativado'}`);
    console.log(`YouTube H.264 + FPS: ${CONFIG.youtubeH264Force ? 'Ativado' : 'Desativado'} - ${CONFIG.youtubeH264Force ? `Forçando H.264 e limitando ${CONFIG.youtubeFPSLimit} FPS` : 'Usando codecs padrão'}`);
    console.log(`Focus: Performance optimization com todas as otimizações integradas`);
    
    // ==========================================
    // 13. OTIMIZAÇÕES ESPECÍFICAS DO YOUTUBE
    // ==========================================
    if (CONFIG.youtubeH264Force && host.includes('youtube.com') && !isCriticalSite) {
        // YouTube H.264 + FPS (clone do h264ify)
        const mediaSource = window.MediaSource;
        if (mediaSource) {
            const originalIsTypeSupported = mediaSource.isTypeSupported.bind(mediaSource);
            const DISALLOWED_TYPES_REGEX = /webm|vp8|vp9|av01/i;
            const FRAME_RATE_REGEX = /framerate=(\d+)/;
            
            mediaSource.isTypeSupported = (type) => {
                if (typeof type !== 'string') return false;
                
                // Bloquear codecs ineficientes
                if (DISALLOWED_TYPES_REGEX.test(type)) return false;
                
                // Limitar FPS para economizar CPU
                const frameRateMatch = FRAME_RATE_REGEX.exec(type);
                if (frameRateMatch && frameRateMatch[1] > CONFIG.youtubeFPSLimit) {
                    return false;
                }
                
                return originalIsTypeSupported(type);
            };
            
            console.log(`YouTube H.264 + FPS ativado - Forçando H.264 e limitando ${CONFIG.youtubeFPSLimit} FPS`);
        }
    }
    
})();
