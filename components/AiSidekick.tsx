
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { CloseIcon, BotIcon, ImageIcon, MicIcon, SearchIcon, MapIcon, BrainCircuitIcon, SendIcon, StopCircleIcon, SparklesIcon } from './icons/EditorIcons';
import type { ChatMessage } from '../App';

interface AiSidekickProps {
    ai: GoogleGenAI | null;
    onClose: () => void;
    onInsertText: (text: string) => void;
    setToast: (message: string) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

type ActiveTab = 'chat' | 'image' | 'live';
type ChatMode = 'default' | 'search' | 'maps' | 'thinking';

// Live Conversation Audio Helper
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const AiSidekick: React.FC<AiSidekickProps> = ({ ai, onClose, onInsertText, setToast, t }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    
    // Chat state
    const [chatMode, setChatMode] = useState<ChatMode>('default');
    const [thinkingBudget, setThinkingBudget] = useState(1024);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    // Image state
    const [imagePrompt, setImagePrompt] = useState('');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Live state
    const [isLive, setIsLive] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState<{ user: string, model: string} | null>(null);
    const sessionRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const liveOutputAudioContextRef = useRef<AudioContext | null>(null);
    const liveNextStartTimeRef = useRef(0);

    const cleanupLive = () => {
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close());
            sessionRef.current = null;
        }
        if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
        if (sourceRef.current) sourceRef.current.disconnect();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        if (liveOutputAudioContextRef.current && liveOutputAudioContextRef.current.state !== 'closed') liveOutputAudioContextRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        setIsLive(false);
        setLiveTranscript(null);
    };

    useEffect(() => {
        return () => cleanupLive();
    }, []);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleChatSubmit = async () => {
        if (!ai) {
          setToast(t('toasts.aiNotAvailable'));
          return;
        }
        if (!chatInput.trim() || isChatting) return;

        const newUserMessage: ChatMessage = { role: 'user', text: chatInput };
        setChatHistory(prev => [...prev, newUserMessage]);
        setChatInput('');
        setIsChatting(true);

        const modelResponse: ChatMessage = { role: 'model', text: '', isThinking: true };
        setChatHistory(prev => [...prev, modelResponse]);

        try {
            let modelName = 'gemini-2.5-flash';
            let config: any = {};
            if (chatMode === 'thinking') {
                modelName = 'gemini-2.5-pro-preview-02-19'; // Latest model supporting thinking
                // Important: thinkingBudget must be set when using thinkingConfig
                config.thinkingConfig = { thinkingBudget: thinkingBudget }; 
            } else if (chatMode === 'search') {
                config.tools = [{ googleSearch: {} }];
            } else if (chatMode === 'maps') {
                config.tools = [{ googleMaps: {} }];
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    config.toolConfig = { retrievalConfig: { latLng: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }}};
                } catch (e) {
                    setToast(t('toasts.geolocationError'));
                }
            }

            const stream = await ai.models.generateContentStream({
                model: modelName,
                contents: chatInput,
                config,
            });

            let fullText = '';
            let finalSources: any[] = [];
            for await (const chunk of stream) {
                fullText += chunk.text;
                if(chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    finalSources = chunk.candidates[0].groundingMetadata.groundingChunks;
                }
                setChatHistory(prev => prev.map((msg, index) => 
                    index === prev.length - 1 ? { ...msg, text: fullText, isThinking: false } : msg
                ));
            }
            if (finalSources.length > 0) {
                 setChatHistory(prev => prev.map((msg, index) => 
                    index === prev.length - 1 ? { ...msg, sources: finalSources } : msg
                ));
            }

        } catch (error) {
            console.error("Chat error:", error);
            setToast(t('toasts.aiError'));
             setChatHistory(prev => prev.map((msg, index) => 
                index === prev.length - 1 ? { ...msg, text: t('toasts.aiError'), isThinking: false } : msg
            ));
        } finally {
            setIsChatting(false);
        }
    };
    
    const handleGenerateImage = async () => {
        if (!ai) {
          setToast(t('toasts.aiNotAvailable'));
          return;
        }
        if (!imagePrompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setGeneratedImages([]);
        setToast(t('toasts.aiGeneratingImage'));
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imagePrompt,
            });
            const images = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
            setGeneratedImages(images);
        } catch (error) {
            console.error("Image generation error:", error);
            setToast(t('toasts.aiError'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStartLive = async () => {
        if (!ai) {
          setToast(t('toasts.aiNotAvailable'));
          return;
        }
        if (isLive) return;

        setIsLive(true);
        setLiveTranscript({ user: '', model: '' });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            // @ts-ignore
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            // @ts-ignore
            liveOutputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            liveNextStartTimeRef.current = 0;

            sessionRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = audioContextRef.current!.createMediaStreamSource(stream);
                        sourceRef.current = source;
                        const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const i16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) { i16[i] = inputData[i] * 32768; }
                            const blob: GenAIBlob = { data: encode(new Uint8Array(i16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                            sessionRef.current?.then(s => s.sendRealtimeInput({ media: blob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContextRef.current!.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.serverContent?.inputTranscription) {
                            setLiveTranscript(prev => ({...prev!, user: prev!.user + msg.serverContent!.inputTranscription!.text }));
                        }
                        if (msg.serverContent?.outputTranscription) {
                            setLiveTranscript(prev => ({...prev!, model: prev!.model + msg.serverContent!.outputTranscription!.text }));
                        }
                        if (msg.serverContent?.turnComplete) {
                            setLiveTranscript(prev => ({ user: '', model: ''}));
                        }
                        
                        const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (audioData && liveOutputAudioContextRef.current) {
                             const audioContext = liveOutputAudioContextRef.current;
                            liveNextStartTimeRef.current = Math.max(
                                liveNextStartTimeRef.current,
                                audioContext.currentTime,
                            );
                            const audioBuffer = await decodeAudioData(
                                decode(audioData),
                                audioContext,
                                24000,
                                1,
                            );
                            const sourceNode = audioContext.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(audioContext.destination);
                            sourceNode.start(liveNextStartTimeRef.current);
                            liveNextStartTimeRef.current += audioBuffer.duration;
                        }
                    },
                    onerror: (e) => { console.error(e); setToast(t('toasts.aiError')); cleanupLive(); },
                    onclose: () => cleanupLive(),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
        } catch (e) {
            console.error(e);
            setToast(t('toasts.aiMicError'));
            cleanupLive();
        }
    };
    
    const ChatModeButton: React.FC<{ mode: ChatMode; icon: React.ReactNode; label: string }> = ({ mode, icon, label }) => (
      <button
        onClick={() => setChatMode(mode)}
        title={label}
        className={`p-2 rounded-md transition-all duration-200 ${chatMode === mode ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
      >
        {icon}
      </button>
    );

    return (
        <aside className="w-full md:w-96 bg-white dark:bg-gray-900 md:border-l border-gray-100 dark:border-gray-800 flex flex-col h-full animate-in slide-in-from-right duration-500 ease-out">
            <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="text-yellow-500 w-6 h-6" />
                    <h2 className="text-[11px] font-semibold text-gray-900 dark:text-gray-100">{t('sidekick.title')}</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90"><CloseIcon /></button>
            </header>

            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex justify-around bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5">
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-[10px] font-semibold rounded-xl flex-1 transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-gray-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{t('sidekick.chat')}</button>
                    <button onClick={() => setActiveTab('image')} className={`px-4 py-2 text-[10px] font-semibold rounded-xl flex-1 transition-all ${activeTab === 'image' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-gray-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{t('sidekick.image')}</button>
                    <button onClick={() => setActiveTab('live')} className={`px-4 py-2 text-[10px] font-semibold rounded-xl flex-1 transition-all ${activeTab === 'live' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-gray-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{t('sidekick.live')}</button>
                </div>
            </div>

            {/* Chat Tab */}
            {activeTab === 'chat' && (
                <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/20 dark:border-white/5 bg-white/10 dark:bg-gray-900/10">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <ChatModeButton mode="default" icon={<BotIcon />} label={t('sidekick.chatModes.default')} />
                            <ChatModeButton mode="search" icon={<SearchIcon />} label={t('sidekick.chatModes.search')} />
                            <ChatModeButton mode="maps" icon={<MapIcon />} label={t('sidekick.chatModes.maps')} />
                            <ChatModeButton mode="thinking" icon={<BrainCircuitIcon />} label={t('sidekick.chatModes.thinking')} />
                        </div>
                        {chatMode === 'thinking' && (
                             <div className="p-4 bg-blue-500/5 dark:bg-blue-400/5 rounded-2xl border border-blue-500/20">
                                <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex justify-between mb-2">
                                    <span>Thinking Budget</span>
                                    <span>{thinkingBudget} tokens</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="1024" 
                                    max="32768" 
                                    step="1024" 
                                    value={thinkingBudget} 
                                    onChange={(e) => setThinkingBudget(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">Higher budget allows specifically designed "thinking" models to reason more deeply.</p>
                             </div>
                        )}
                    </div>
                    <div ref={chatBodyRef} className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar">
                        {chatHistory.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400/50">
                                <BotIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-[11px] font-bold uppercase tracking-widest">Start a conversation...</p>
                            </div>
                        )}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'}`}>
                                    <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br/>')}}></div>
                                    {msg.isThinking && (
                                        <div className="flex items-center gap-2 mt-3 text-[10px] font-semibold text-blue-500 animate-pulse">
                                            <BrainCircuitIcon className="w-3 h-3" />
                                            <span>Thinking...</span>
                                        </div>
                                    )}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 mb-2">Sources</p>
                                            <div className="flex flex-col gap-2">
                                                {msg.sources.map((s, si) => (
                                                    <a key={si} href={s.web?.uri || s.maps?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-medium text-blue-500 hover:text-blue-600 transition-colors truncate">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                                                        {s.web?.title || s.maps?.title}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-white/20 dark:border-white/5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                                placeholder={t('sidekick.chatPlaceholder')}
                                className="flex-grow w-full pl-5 pr-14 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm text-sm"
                                disabled={isChatting}
                            />
                            <button 
                                onClick={handleChatSubmit} 
                                disabled={isChatting || !chatInput.trim()} 
                                className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-all shadow-lg shadow-blue-500/25 active:scale-90"
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Tab */}
            {activeTab === 'image' && (
                 <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-white/20 dark:border-white/5 bg-white/10 dark:bg-gray-900/10">
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-wider">{t('sidekick.imageDescription')}</p>
                    </div>
                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                        {isGenerating && (
                            <div className="flex flex-col items-center justify-center h-40 gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin"></div>
                                    <SparklesIcon className="absolute inset-0 m-auto w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-[10px] font-semibold text-gray-500">{t('sidekick.imageGenerating')}</span>
                            </div>
                        )}
                        {!isGenerating && generatedImages.length === 0 && (
                             <div className="flex flex-col items-center justify-center h-full text-gray-400/50">
                                <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-[11px] font-semibold">Enter a prompt to generate images</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            {generatedImages.map((src, i) => (
                                <div key={i} className="group relative rounded-2xl overflow-hidden aspect-square bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                                    <img src={src} alt="Generated" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                        <button 
                                            onClick={() => onInsertText(`<img src="${src}" style="max-width:100%" />`)}
                                            className="px-5 py-2.5 bg-white text-black text-[10px] font-semibold rounded-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 active:scale-95"
                                        >
                                            Insert
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 border-t border-white/20 dark:border-white/5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={imagePrompt}
                                onChange={e => setImagePrompt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
                                placeholder={t('sidekick.imagePlaceholder')}
                                className="flex-grow w-full pl-5 pr-14 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all shadow-sm text-sm"
                                disabled={isGenerating}
                            />
                            <button 
                                onClick={handleGenerateImage} 
                                disabled={isGenerating || !imagePrompt.trim()} 
                                className="absolute right-2 p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-400 transition-all shadow-lg shadow-purple-500/25 active:scale-90"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Live Tab */}
            {activeTab === 'live' && (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                    <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-10 transition-all duration-700 ${isLive ? 'bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.3)] scale-110' : 'bg-blue-500/5 border border-white/20 dark:border-white/5'}`}>
                        {isLive ? (
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                                <MicIcon className="w-16 h-16 text-red-500 relative z-10" />
                            </div>
                        ) : (
                            <MicIcon className="w-16 h-16 text-blue-500 opacity-20" />
                        )}
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">Gemini Live</h3>
                    <p className="mb-10 text-[11px] font-medium text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">{t('sidekick.liveDescription')}</p>
                    
                    <button 
                        onClick={isLive ? cleanupLive : handleStartLive} 
                        className={`flex items-center gap-4 px-10 py-5 rounded-2xl text-white font-semibold text-[11px] transition-all duration-500 active:scale-95 ${isLive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isLive ? <StopCircleIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
                        <span>{isLive ? t('sidekick.liveStop') : t('sidekick.liveStart')}</span>
                    </button>

                    {isLive && liveTranscript && (
                        <div className="mt-10 w-full text-left p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-48 overflow-y-auto custom-scrollbar">
                           {liveTranscript.user && <p className="text-sm mb-3 leading-relaxed"><strong className="text-[10px] font-semibold text-blue-500 block mb-1">You</strong> {liveTranscript.user}</p>}
                           {liveTranscript.model && <p className="text-sm leading-relaxed"><strong className="text-[10px] font-semibold text-emerald-500 block mb-1">Gemini</strong> {liveTranscript.model}</p>}
                           {!liveTranscript.user && !liveTranscript.model && <p className="text-[10px] font-medium text-center text-gray-400 italic animate-pulse">Listening...</p>}
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};

export default AiSidekick;
