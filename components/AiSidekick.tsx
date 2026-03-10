
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
        <aside className="w-full md:w-96 bg-gray-50 dark:bg-gray-800 md:border-l border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-2xl z-50">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="text-yellow-500 w-6 h-6 animate-pulse" />
                    <h2 className="font-bold text-gray-800 dark:text-gray-100">{t('sidekick.title')}</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><CloseIcon /></button>
            </header>

            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex justify-around bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-1.5 text-sm font-medium rounded-md flex-1 transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{t('sidekick.chat')}</button>
                    <button onClick={() => setActiveTab('image')} className={`px-4 py-1.5 text-sm font-medium rounded-md flex-1 transition-all ${activeTab === 'image' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{t('sidekick.image')}</button>
                    <button onClick={() => setActiveTab('live')} className={`px-4 py-1.5 text-sm font-medium rounded-md flex-1 transition-all ${activeTab === 'live' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{t('sidekick.live')}</button>
                </div>
            </div>

            {/* Chat Tab */}
            {activeTab === 'chat' && (
                <div className="flex-grow flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <ChatModeButton mode="default" icon={<BotIcon />} label={t('sidekick.chatModes.default')} />
                            <ChatModeButton mode="search" icon={<SearchIcon />} label={t('sidekick.chatModes.search')} />
                            <ChatModeButton mode="maps" icon={<MapIcon />} label={t('sidekick.chatModes.maps')} />
                            <ChatModeButton mode="thinking" icon={<BrainCircuitIcon />} label={t('sidekick.chatModes.thinking')} />
                        </div>
                        {chatMode === 'thinking' && (
                             <div className="px-1 pt-2 pb-1 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800/30">
                                <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex justify-between mb-1">
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
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Higher budget allows specifically designed "thinking" models to reason more deeply.</p>
                             </div>
                        )}
                    </div>
                    <div ref={chatBodyRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                        {chatHistory.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                                <BotIcon className="w-12 h-12 mb-2" />
                                <p className="text-sm">Start a conversation...</p>
                            </div>
                        )}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-600'}`}>
                                    <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br/>')}}></div>
                                    {msg.isThinking && (
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                                            <BrainCircuitIcon className="w-3 h-3" />
                                            <span>Thinking...</span>
                                        </div>
                                    )}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600/50">
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Sources</p>
                                            <div className="flex flex-col gap-1">
                                                {msg.sources.map((s, si) => (
                                                    <a key={si} href={s.web?.uri || s.maps?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline truncate">
                                                        <span className="w-1 h-1 rounded-full bg-blue-500"></span>
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
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                                placeholder={t('sidekick.chatPlaceholder')}
                                className="flex-grow w-full pl-4 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                disabled={isChatting}
                            />
                            <button 
                                onClick={handleChatSubmit} 
                                disabled={isChatting || !chatInput.trim()} 
                                className="absolute right-1.5 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-all shadow-md"
                            >
                                <SendIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Tab */}
            {activeTab === 'image' && (
                 <div className="flex-grow flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('sidekick.imageDescription')}</p>
                    </div>
                    <div className="flex-grow p-4 overflow-y-auto">
                        {isGenerating && (
                            <div className="flex flex-col items-center justify-center h-40 gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-gray-500">{t('sidekick.imageGenerating')}</span>
                            </div>
                        )}
                        {!isGenerating && generatedImages.length === 0 && (
                             <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                                <ImageIcon className="w-12 h-12 mb-2" />
                                <p className="text-sm">Enter a prompt to generate images</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            {generatedImages.map((src, i) => (
                                <div key={i} className="group relative rounded-lg overflow-hidden shadow-md aspect-square bg-white dark:bg-gray-700">
                                    <img src={src} alt="Generated" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            onClick={() => onInsertText(`<img src="${src}" style="max-width:100%" />`)}
                                            className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full transform scale-90 group-hover:scale-100 transition-transform"
                                        >
                                            Insert
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={imagePrompt}
                                onChange={e => setImagePrompt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
                                placeholder={t('sidekick.imagePlaceholder')}
                                className="flex-grow w-full pl-4 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                disabled={isGenerating}
                            />
                            <button 
                                onClick={handleGenerateImage} 
                                disabled={isGenerating || !imagePrompt.trim()} 
                                className="absolute right-1.5 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-400 transition-all shadow-md"
                            >
                                <ImageIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Live Tab */}
            {activeTab === 'live' && (
                <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${isLive ? 'bg-red-50 dark:bg-red-900/20 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        {isLive ? (
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                                <MicIcon className="w-12 h-12 text-red-500 relative z-10" />
                            </div>
                        ) : (
                            <MicIcon className="w-12 h-12 text-blue-500 opacity-50" />
                        )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Gemini Live</h3>
                    <p className="mb-8 text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">{t('sidekick.liveDescription')}</p>
                    
                    <button 
                        onClick={isLive ? cleanupLive : handleStartLive} 
                        className={`flex items-center gap-3 px-8 py-4 rounded-full text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ${isLive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isLive ? <StopCircleIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
                        <span>{isLive ? t('sidekick.liveStop') : t('sidekick.liveStart')}</span>
                    </button>

                    {isLive && liveTranscript && (
                        <div className="mt-8 w-full text-left p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg h-40 overflow-y-auto">
                           {liveTranscript.user && <p className="text-sm mb-2"><strong className="text-blue-500">You:</strong> {liveTranscript.user}</p>}
                           {liveTranscript.model && <p className="text-sm"><strong className="text-green-500">Gemini:</strong> {liveTranscript.model}</p>}
                           {!liveTranscript.user && !liveTranscript.model && <p className="text-xs text-center text-gray-400 italic">Listening...</p>}
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};

export default AiSidekick;
