import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  ArrowRight, 
  Square, 
  Clock, 
  CheckCircle, 
  X,
  Loader2,
  Plus,
  BarChart3,
  Trophy,
  Users,
  Calendar,
  Settings,
  ChevronLeft,
  Sparkles,
  Save,
  Edit2,
  Image as ImageIcon,
  GripVertical,
  Trash2,
  Upload,
  Share2,
  Download,
  Eye,
  CalendarClock,
  ExternalLink,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  FileText,
  AlignLeft,
  File
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { 
  Session, 
  SessionType, 
  TimerMode, 
  ViewState,
  Difficulty,
  Question
} from './types';
import { generateQuestions, generateImageForQuestion } from './services/geminiService';

// --- UTILS --- //
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy', err);
    return false;
  }
};

const QUESTION_COUNT_OPTIONS = [1, 3, 5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

const GenericPlaceholderImage: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-slate-200 flex items-center justify-center text-slate-400 ${className}`}>
    <span className="text-xs">Image Placeholder</span>
  </div>
);

// --- SUB-COMPONENT: SESSION CARD --- //
const SessionCard: React.FC<{
  session: Session,
  onOpen: (s: Session) => void,
  onDelete: (id: string) => void,
  onUpdateTitle: (id: string, title: string) => void
}> = ({ session, onOpen, onDelete, onUpdateTitle }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(session.title);
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}?join=${session.joinCode}`;
    copyToClipboard(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveTitle = () => {
    if (tempTitle.trim()) {
      onUpdateTitle(session.id, tempTitle);
    }
    setIsEditingTitle(false);
  };

  return (
    <div 
      onClick={() => !isEditingTitle && onOpen(session)}
      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group relative"
    >
      <div className="flex items-center gap-4 flex-1">
         <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${session.type === SessionType.QUIZ ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {session.type === SessionType.QUIZ ? <Trophy className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
         </div>
         <div className="flex-1">
           {isEditingTitle ? (
             <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
               <input 
                 autoFocus
                 type="text" 
                 value={tempTitle}
                 onChange={(e) => setTempTitle(e.target.value)}
                 onBlur={saveTitle}
                 onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                 className="font-bold text-slate-800 border-b-2 border-indigo-500 outline-none bg-transparent w-full"
               />
               <button onClick={saveTitle} className="text-green-600"><CheckCircle className="w-4 h-4"/></button>
             </div>
           ) : (
             <div className="flex items-center gap-2 mb-1">
               <h4 className="font-bold text-slate-800 truncate">{session.title}</h4>
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                 className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-1"
               >
                 <Edit2 className="w-3 h-3" />
               </button>
             </div>
           )}
           <p className="text-xs text-slate-500 flex items-center gap-2">
             <span>{session.questions.length} Qs</span>
             <span>•</span>
             <span>{new Date(session.createdAt).toLocaleDateString()}</span>
             <span>•</span>
             <span className={`uppercase font-bold text-[10px] px-1.5 py-0.5 rounded ${
               session.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
               session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
             }`}>
               {session.status}
             </span>
             {session.status === 'SCHEDULED' && session.config.scheduledStartTime && (
                <span className="text-blue-600 flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  {new Date(session.config.scheduledStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
             )}
           </p>
         </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={handleShare}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative"
          title="Copy Guest Link"
        >
          {copied ? <Check className="w-5 h-5 text-green-600" /> : <Share2 className="w-5 h-5" />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Session"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: LOBBY VIEW --- //
const LobbyView: React.FC<{
  session: Session,
  onStart: () => void,
  onBack: () => void
}> = ({ session, onStart, onBack }) => {
  const [copied, setCopied] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [recentJoiners, setRecentJoiners] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<string>('');
  
  const link = `${window.location.origin}?join=${session.joinCode}`;

  const handleCopy = () => {
    copyToClipboard(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    // Simulate participants joining
    const interval = setInterval(() => {
      setParticipantCount(prev => {
         // Randomly add 0 or 1 participant occasionally
         const shouldAdd = Math.random() > 0.3; // 70% chance to add
         if (!shouldAdd) return prev;
         
         const newCount = prev + 1;
         
         // Simulate names for effect
         const names = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Quinn", "Avery", "Blake", "Drew"];
         const randomName = names[Math.floor(Math.random() * names.length)] + " " + Math.floor(Math.random() * 100);
         
         setRecentJoiners(prevJoiners => [randomName, ...prevJoiners].slice(0, 3));
         return newCount;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (session.config.scheduledStartTime) {
        const updateTimer = () => {
            const target = new Date(session.config.scheduledStartTime!).getTime();
            const now = new Date().getTime();
            const distance = target - now;
            
            if (distance < 0) {
                setCountdown('');
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                let timeStr = '';
                if (days > 0) timeStr += `${days}d `;
                timeStr += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                setCountdown(timeStr);
            }
        };
        
        updateTimer(); // Initial call
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }
  }, [session.config.scheduledStartTime]);

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-[80vh] flex flex-col items-center justify-center text-center">
      <button onClick={onBack} className="absolute top-20 left-6 text-slate-500 hover:text-slate-800 flex items-center gap-1">
        <ChevronLeft className="w-5 h-5" /> Back
      </button>

      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-indigo-100 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="mb-8 flex flex-col items-center gap-3">
           <div className="flex items-center gap-2">
               <span className={`px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase flex items-center gap-2 border ${session.type === SessionType.QUIZ ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                 {session.type === SessionType.QUIZ ? <Trophy className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                 {session.type} Session
               </span>
               
               {countdown ? (
                  <span className="px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200">
                    <CalendarClock className="w-4 h-4" /> Starts in {countdown}
                  </span>
               ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase flex items-center gap-2 bg-slate-100 text-slate-600 border border-slate-200">
                    <CheckCircle className="w-4 h-4" /> Lobby Open
                  </span>
               )}
           </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">{session.title}</h1>
        <p className="text-slate-500 mb-8 text-lg">Join the session to participate</p>

        <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-200 shadow-inner">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Join Code</p>
           <div className="text-7xl font-black text-indigo-600 tracking-widest mb-6 font-mono select-all">
             {session.joinCode}
           </div>
           
           <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
             <div className="bg-white px-4 py-3 rounded-xl border border-slate-300 text-slate-500 text-sm truncate flex-1 shadow-sm font-mono">
               {link}
             </div>
             <button 
               onClick={handleCopy}
               className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md hover:shadow-lg active:scale-95"
               title="Copy Link"
             >
               {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
             </button>
           </div>
        </div>

        <div className="mb-8 w-full max-w-md mx-auto">
          <div className="flex items-center justify-center gap-3 text-slate-800 font-bold mb-4 text-xl">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
            </div>
            <span>{participantCount} Participants ready</span>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-100 p-4 min-h-[100px] flex flex-col items-center justify-center shadow-sm">
              {recentJoiners.length > 0 ? (
                 <div className="flex flex-col gap-2 w-full animate-fade-in">
                   {recentJoiners.map((name, i) => (
                     <div key={i} className="bg-slate-50 border border-slate-100 py-2 px-4 rounded-lg text-sm text-slate-600 flex items-center justify-between">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-green-600 flex items-center gap-1 font-bold">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Joined
                        </span>
                     </div>
                   ))}
                   {participantCount > 3 && (
                       <div className="text-xs text-slate-400 mt-1 italic">...and {participantCount - 3} others</div>
                   )}
                 </div>
              ) : (
                 <div className="text-slate-400 text-sm flex flex-col items-center">
                    <Loader2 className="w-8 h-8 opacity-20 animate-spin mb-2" />
                    Waiting for connections...
                 </div>
              )}
          </div>
        </div>

        <button 
          onClick={onStart}
          className={`w-full py-4 font-bold text-xl rounded-xl shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 ${
            countdown 
                ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
          }`}
        >
          {countdown ? (
              <>Start Now (Early)</>
          ) : (
              <>Start Session <ArrowRight className="w-6 h-6" /></>
          )}
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: PLAY VIEW --- //
const PlayView: React.FC<{ 
  session: Session, 
  onUpdateSession: (updatedSession: Session) => void,
  onSubmit: (answers: Record<string, number>) => void,
  isHost?: boolean,
  isPreview?: boolean,
  onExitPreview?: () => void
}> = ({ session, onUpdateSession, onSubmit, isHost = false, isPreview = false, onExitPreview }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (session.config.timerMode === TimerMode.NONE) return 0;
    return session.config.timeValue;
  });
  
  const [totalTime, setTotalTime] = useState<number>(() => {
    if (session.config.timerMode === TimerMode.NONE) return 0;
    return session.config.timeValue;
  });

  const [isPaused, setIsPaused] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Question | null>(null);

  // Timer Tick
  useEffect(() => {
    if (session.config.timerMode === TimerMode.NONE) return;
    if (isPaused || isEditing) return;

    if (timeLeft <= 0) {
      if (session.config.timerMode === TimerMode.WHOLE_QUIZ) {
        handleSubmit();
      } else {
        handleNext(); 
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, session.config.timerMode, isPaused, isEditing]);

  useEffect(() => {
     if (session.config.timerMode === TimerMode.PER_QUESTION) {
       setTimeLeft(session.config.timeValue);
       setTotalTime(session.config.timeValue);
       setIsPaused(false); 
       setShowFeedback(false);
       setIsTransitioning(false);
       setIsEditing(false);
     }
  }, [currentQuestionIdx, session.config.timerMode, session.config.timeValue]);

  const handleSelect = (idx: number) => {
    if (showFeedback && !isHost && !isPreview) return; 
    const qId = session.questions[currentQuestionIdx].id;
    setAnswers({ ...answers, [qId]: idx });
  };

  const handleNext = () => {
    if (isTransitioning || isEditing) return;

    if (showFeedback) {
      proceedToNext();
      return;
    }

    if (session.type === SessionType.QUIZ) {
      if (isHost && !isPreview) {
        setShowFeedback(true);
        return;
      }
      
      if (session.config.timerMode !== TimerMode.WHOLE_QUIZ) {
        setShowFeedback(true);
        setIsTransitioning(true);
        if (session.config.timerMode === TimerMode.PER_QUESTION) setIsPaused(true);

        setTimeout(() => {
          proceedToNext();
        }, 2000);
        return;
      }
    }
    proceedToNext();
  };

  const proceedToNext = () => {
    setShowFeedback(false);
    setIsTransitioning(false);
    if (session.config.timerMode === TimerMode.PER_QUESTION) {
      setIsPaused(false); 
    }

    if (currentQuestionIdx < session.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isPreview && onExitPreview) {
      onExitPreview();
    } else {
      onSubmit(answers);
    }
  };

  const toggleEditMode = () => {
    if (isEditing) {
      setIsEditing(false);
      setEditForm(null);
    } else {
      setIsEditing(true);
      setEditForm({ ...session.questions[currentQuestionIdx] });
      setIsPaused(true);
    }
  };

  const saveEdit = () => {
    if (!editForm) return;
    const updatedQuestions = [...session.questions];
    updatedQuestions[currentQuestionIdx] = editForm;
    onUpdateSession({ ...session, questions: updatedQuestions });
    setIsEditing(false);
    setEditForm(null);
    if (session.config.timerMode !== TimerMode.PER_QUESTION) {
       setIsPaused(false);
    }
  };

  if (!session.questions || session.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-xl font-bold text-slate-500">No questions available.</div>
        <button onClick={handleSubmit} className="mt-4 text-indigo-600 font-bold">End Session</button>
      </div>
    );
  }

  const currentQ = session.questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / session.questions.length) * 100;
  
  const timePercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  let timerColor = 'bg-indigo-600';
  if (timePercent < 50) timerColor = 'bg-yellow-500';
  if (timePercent < 20) timerColor = 'bg-red-500';

  const userSelectedIdx = answers[currentQ.id];

  return (
    <div className={`flex flex-col items-center pt-10 px-4 w-full max-w-4xl mx-auto ${isPreview ? 'fixed inset-0 bg-slate-100 z-[100] pt-4' : ''}`}>
      <div className="w-full max-w-2xl">
        {isPreview && (
          <div className="bg-indigo-900 text-white p-3 rounded-lg mb-4 flex justify-between items-center shadow-lg">
             <span className="font-bold flex items-center gap-2"><Eye className="w-4 h-4" /> Guest Preview Mode</span>
             <button onClick={onExitPreview} className="text-xs bg-white text-indigo-900 px-3 py-1 rounded font-bold hover:bg-slate-200">
               Exit Preview
             </button>
          </div>
        )}

        {/* Host Controls */}
        {isHost && !isPreview && (
           <div className="bg-slate-800 text-white p-4 rounded-xl mb-6 shadow-xl flex justify-between items-center">
             <div className="flex items-center gap-2">
                <span className="font-bold bg-indigo-500 text-xs px-2 py-1 rounded uppercase">Host Control</span>
                <span className="text-sm text-slate-300 hidden sm:inline">Control the flow</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={toggleEditMode}
                  className={`p-2 rounded transition ${isEditing ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                  title="Edit Question"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                {session.config.timerMode !== TimerMode.NONE && (
                  <button 
                    onClick={() => setIsPaused(!isPaused)} 
                    className="p-2 hover:bg-slate-700 rounded transition"
                    title={isPaused ? "Resume Timer" : "Pause Timer"}
                    disabled={isEditing}
                  >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </button>
                )}
                <button 
                  onClick={() => handleNext()}
                  className="p-2 hover:bg-slate-700 rounded transition"
                  title="Skip / Next Question"
                  disabled={isEditing}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSubmit}
                  className="p-2 hover:bg-red-900 bg-red-800 rounded transition ml-2"
                  title="End Session Early"
                >
                   <Square className="w-4 h-4 fill-current" />
                </button>
             </div>
           </div>
        )}

        {/* Header / Progress */}
        <div className="mb-6 flex justify-between items-center text-slate-600 font-medium">
          <span>Question {currentQuestionIdx + 1} of {session.questions.length}</span>
          {session.config.timerMode !== TimerMode.NONE && (
            <div className={`flex items-center gap-2 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>
               <Clock className="w-5 h-5" />
               <span className="text-xl font-bold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1 mb-8">
           <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
           </div>
           
           {session.config.timerMode !== TimerMode.NONE && (
             <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${timerColor} transition-all duration-1000 linear ${timePercent < 20 ? 'animate-pulse' : ''}`} 
                  style={{ width: `${timePercent}%` }}
                ></div>
             </div>
           )}
        </div>

        {/* Question Card */}
        <div className={`bg-white rounded-2xl shadow-lg p-8 mb-8 relative overflow-hidden transition-all ${isEditing ? 'ring-4 ring-indigo-500/20' : ''}`}>
           {isPaused && !showFeedback && !isEditing && (
             <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center backdrop-blur-[1px] z-10">
               <div className="bg-white px-6 py-2 rounded-full shadow-lg font-bold text-slate-700 flex items-center gap-2">
                 <Pause className="w-4 h-4" /> Paused
               </div>
             </div>
           )}
           
           <div className="mb-6">
              {currentQ.imageUrl ? (
                <img src={currentQ.imageUrl} alt="Question" className="rounded-xl w-full max-h-64 object-contain bg-slate-100" />
              ) : (
                <GenericPlaceholderImage className="w-full h-48 rounded-xl" />
              )}
           </div>

           {isEditing && editForm ? (
             <div className="mb-8">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Question Text</label>
               <textarea
                 value={editForm.text}
                 onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                 className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                 rows={3}
               />
             </div>
           ) : (
             <h2 className="text-2xl font-bold text-slate-800 mb-8">{currentQ.text}</h2>
           )}
           
           <div className="grid gap-4">
             {(isEditing && editForm ? editForm.options : currentQ.options).map((opt, idx) => {
               if (isEditing && editForm) {
                 return (
                   <div key={idx} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-slate-100 text-slate-500">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...editForm.options];
                          newOptions[idx] = e.target.value;
                          setEditForm({ ...editForm, options: newOptions });
                        }}
                        className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                      />
                      {session.type === SessionType.QUIZ && (
                        <button 
                          onClick={() => setEditForm({ ...editForm, correctAnswerIndex: idx })}
                          className={`p-2 rounded-full ${editForm.correctAnswerIndex === idx ? 'bg-green-100 text-green-600' : 'text-slate-300 hover:text-slate-400'}`}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                   </div>
                 );
               }

               const isSelected = userSelectedIdx === idx;
               let stateClass = 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'; 
               let circleClass = 'bg-white border-slate-300 text-slate-400 group-hover:border-slate-400';
               
               if (showFeedback && session.type === SessionType.QUIZ) {
                   if (idx === currentQ.correctAnswerIndex) {
                       stateClass = 'border-green-500 bg-green-50 text-green-800';
                       circleClass = 'bg-green-500 border-green-500 text-white';
                   } else if (isSelected) {
                       stateClass = 'border-red-500 bg-red-50 text-red-800';
                       circleClass = 'bg-red-500 border-red-500 text-white';
                   } else {
                       stateClass = 'opacity-50 border-slate-100 bg-slate-50';
                   }
               } else if (isSelected) {
                   stateClass = 'border-indigo-600 bg-indigo-50 text-indigo-700';
                   circleClass = 'bg-indigo-600 border-indigo-600 text-white';
               }

               return (
                 <button
                   key={idx}
                   disabled={(isHost && !isPreview) || showFeedback || isTransitioning} 
                   onClick={() => (!isHost || isPreview) && handleSelect(idx)}
                   className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 group ${stateClass} ${isHost && !isPreview ? 'cursor-default opacity-80' : ''}`}
                 >
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-colors ${circleClass}`}>
                      {String.fromCharCode(65 + idx)}
                   </div>
                   <span className="font-medium text-lg flex-1">{opt}</span>
                   {showFeedback && idx === currentQ.correctAnswerIndex && <CheckCircle className="w-6 h-6 text-green-600" />}
                   {showFeedback && isSelected && idx !== currentQ.correctAnswerIndex && <X className="w-6 h-6 text-red-600" />}
                 </button>
               );
             })}
           </div>
        </div>

        {isEditing ? (
          <div className="flex gap-4">
             <button 
              onClick={toggleEditMode}
              className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={saveEdit}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <button 
            onClick={() => handleNext()}
            disabled={isTransitioning}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
              isTransitioning ? 'bg-slate-300 cursor-wait' : 
              showFeedback ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isTransitioning ? 'Reviewing...' : 
              showFeedback ? 'Continue' : 
              (currentQuestionIdx === session.questions.length - 1 ? (isPreview ? 'Exit Preview' : isHost ? 'End Session' : 'Submit') : (session.type === SessionType.QUIZ && !isHost && !isPreview ? 'Check Answer' : 'Next Question'))
            }
            {!isTransitioning && <ArrowRight className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: EDITOR VIEW --- //
const EditorView: React.FC<{
  session: Session;
  onUpdate: (session: Session) => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  onSchedule: () => void;
  onPreview: () => void;
  onBack: () => void;
}> = ({ session, onUpdate, onSaveDraft, onLaunch, onSchedule, onPreview, onBack }) => {
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  
  // Drag and Drop State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDeleteQuestion = (qId: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
        const updatedQuestions = session.questions.filter(q => q.id !== qId);
        onUpdate({ ...session, questions: updatedQuestions });
    }
  };
  
  const handleAddNewQuestion = () => {
      const newQuestion: Question = {
          id: crypto.randomUUID(),
          text: "",
          options: ["Option A", "Option B"],
          correctAnswerIndex: 0
      };
      onUpdate({ ...session, questions: [...session.questions, newQuestion] });
      setEditingQId(newQuestion.id);
  };
  
  const handleUpdateQuestion = (q: Question) => {
    const updatedQuestions = session.questions.map(existing => existing.id === q.id ? q : existing);
    onUpdate({ ...session, questions: updatedQuestions });
  };

  const handleTextChange = (q: Question, text: string) => {
      handleUpdateQuestion({ ...q, text });
  }

  const handleOptionChange = (q: Question, idx: number, val: string) => {
      const newOptions = [...q.options];
      newOptions[idx] = val;
      handleUpdateQuestion({ ...q, options: newOptions });
  }
  
  const handleAddOption = (q: Question) => {
      if (q.options.length >= 6) return;
      const newOptions = [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`];
      handleUpdateQuestion({ ...q, options: newOptions });
  }
  
  const handleRemoveOption = (q: Question, idxToRemove: number) => {
      if (q.options.length <= 2) return;
      
      if (!confirm("Are you sure you want to remove this answer option?")) return;

      const newOptions = q.options.filter((_, i) => i !== idxToRemove);
      
      // Adjust correct answer index if needed
      let newCorrect = q.correctAnswerIndex;
      if (q.correctAnswerIndex === idxToRemove) {
          newCorrect = 0; // Reset to first option if correct one is deleted
      } else if (q.correctAnswerIndex !== undefined && q.correctAnswerIndex > idxToRemove) {
          newCorrect = q.correctAnswerIndex - 1;
      }
      
      handleUpdateQuestion({ ...q, options: newOptions, correctAnswerIndex: newCorrect });
  }

  const handleQuestionImageUpload = (q: Question, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
             const base64String = reader.result as string;
             handleUpdateQuestion({ ...q, imageUrl: base64String });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveQuestionImage = (q: Question) => {
      handleUpdateQuestion({ ...q, imageUrl: undefined });
  };
  
  const handleGenerateImage = async (q: Question) => {
    // Fallback to session title if question text is empty
    const promptText = (q.text && q.text.trim().length > 0) ? q.text : session.title;

    if (!promptText || promptText.trim().length === 0) {
        alert("Please enter question text or ensure the session has a title to generate an image.");
        return;
    }
    setGeneratingImageId(q.id);
    try {
        const imageUrl = await generateImageForQuestion(promptText);
        handleUpdateQuestion({ ...q, imageUrl });
    } catch (e) {
        console.error(e);
        alert("Could not generate image. Try again.");
    } finally {
        setGeneratingImageId(null);
    }
  }

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    // Highlight effect or class can be added here
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    
    // Perform reorder preview
    if (dragItem.current !== null && dragItem.current !== position) {
         const newQuestions = [...session.questions];
         const draggedItemContent = newQuestions[dragItem.current];
         newQuestions.splice(dragItem.current, 1);
         newQuestions.splice(position, 0, draggedItemContent);
         
         // Update session state
         onUpdate({ ...session, questions: newQuestions });
         
         // Update ref to track new position
         dragItem.current = position;
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
      dragItem.current = null;
      dragOverItem.current = null;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 min-h-screen">
       <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium self-start md:self-auto">
             <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </button>
          
          <div className="flex flex-wrap gap-3">
             <button onClick={onPreview} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all">
                <Eye className="w-4 h-4" /> Preview
             </button>
             <button onClick={onSaveDraft} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all">
                <Save className="w-4 h-4" /> Save Draft
             </button>
             <button onClick={onSchedule} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold flex items-center gap-2 transition-all">
                <CalendarClock className="w-4 h-4" /> Schedule
             </button>
             <button onClick={onLaunch} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5">
                <Play className="w-4 h-4" /> Launch Live
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar: Session Settings */}
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.type === SessionType.QUIZ ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {session.type === SessionType.QUIZ ? <Trophy className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
                   </div>
                   <div>
                      <h2 className="font-bold text-slate-800">Session Settings</h2>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">{session.type}</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                      <input 
                        value={session.title}
                        onChange={(e) => onUpdate({ ...session, title: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none font-medium text-slate-700"
                      />
                   </div>
                   
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Timer Mode</label>
                      <select 
                         value={session.config.timerMode}
                         onChange={(e) => {
                            const newMode = e.target.value as TimerMode;
                            let newTime = session.config.timeValue;
                            if (newMode === TimerMode.WHOLE_QUIZ && newTime < 60) newTime = 300; 
                            if (newMode === TimerMode.PER_QUESTION && newTime > 300) newTime = 30;
                            onUpdate({ ...session, config: { ...session.config, timerMode: newMode, timeValue: newTime } });
                         }}
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none font-medium text-slate-700"
                      >
                         <option value={TimerMode.PER_QUESTION}>Per Question</option>
                         <option value={TimerMode.WHOLE_QUIZ}>Total Quiz Limit</option>
                         <option value={TimerMode.NONE}>No Timer</option>
                      </select>
                   </div>
                   
                   {session.config.timerMode !== TimerMode.NONE && (
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Time ({session.config.timerMode === TimerMode.WHOLE_QUIZ ? 'Minutes' : 'Seconds'})
                        </label>
                        <input 
                           type="number"
                           value={session.config.timerMode === TimerMode.WHOLE_QUIZ ? Math.floor(session.config.timeValue / 60) : session.config.timeValue}
                           onChange={(e) => {
                               const val = parseInt(e.target.value) || 0;
                               onUpdate({ 
                                   ...session, 
                                   config: { 
                                       ...session.config, 
                                       timeValue: session.config.timerMode === TimerMode.WHOLE_QUIZ ? val * 60 : val 
                                   } 
                               });
                           }}
                           className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none font-medium text-slate-700"
                        />
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Right Content: Questions List */}
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                   <h2 className="font-bold text-xl text-slate-800">Questions ({session.questions.length})</h2>
                   <button 
                      onClick={handleAddNewQuestion}
                      className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                   >
                      <Plus className="w-4 h-4" /> Add New
                   </button>
                </div>
                
                <div className="divide-y divide-slate-100">
                   {session.questions.map((q, idx) => (
                      <div 
                        key={q.id} 
                        className="p-6 hover:bg-slate-50 transition-colors group cursor-default"
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnter={(e) => handleDragEnter(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                         {editingQId === q.id ? (
                            <div className="space-y-4 relative">
                               <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                      <GripVertical className="w-4 h-4 text-slate-300" />
                                      Editing Question {idx + 1}
                                  </span>
                                  <button onClick={() => setEditingQId(null)} className="text-indigo-600 text-xs font-bold hover:underline">Done</button>
                               </div>

                               <div className="mb-4">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Visuals</label>
                                  {q.imageUrl ? (
                                      <div className="relative inline-block group">
                                          <img src={q.imageUrl} alt="Question Visual" className="h-48 w-auto rounded-xl border border-slate-200 object-cover bg-slate-50 shadow-sm" />
                                          <button 
                                              onClick={() => handleRemoveQuestionImage(q)}
                                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-10"
                                              title="Remove Image"
                                          >
                                              <X className="w-3 h-3" />
                                          </button>
                                      </div>
                                  ) : (
                                       <div className="flex flex-wrap gap-3">
                                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200 border-dashed text-sm font-bold">
                                              <Upload className="w-4 h-4" />
                                              <span>Upload</span>
                                              <input 
                                                  type="file" 
                                                  accept="image/*" 
                                                  className="hidden" 
                                                  onChange={(e) => handleQuestionImageUpload(q, e)}
                                              />
                                          </label>
                                          <button
                                              onClick={() => handleGenerateImage(q)}
                                              disabled={generatingImageId === q.id}
                                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border border-indigo-200 border-dashed text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                              {generatingImageId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                              <span>Generate AI Image</span>
                                          </button>
                                       </div>
                                  )}
                               </div>

                               <textarea
                                  value={q.text}
                                  onChange={(e) => handleTextChange(q, e.target.value)}
                                  className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-slate-800"
                                  rows={2}
                                  placeholder="Type your question here..."
                               />
                               <div className="space-y-2">
                                  {q.options.map((opt, i) => (
                                     <div key={i} className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${session.type === SessionType.QUIZ && i === q.correctAnswerIndex ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                           {String.fromCharCode(65 + i)}
                                        </div>
                                        <input 
                                           value={opt}
                                           onChange={(e) => handleOptionChange(q, i, e.target.value)}
                                           className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                        />
                                        {session.type === SessionType.QUIZ && (
                                            <button 
                                              onClick={() => handleUpdateQuestion({ ...q, correctAnswerIndex: i })}
                                              className={`p-1 rounded-full ${i === q.correctAnswerIndex ? 'text-green-600' : 'text-slate-300 hover:text-green-500'}`}
                                              title="Mark as correct answer"
                                            >
                                               <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleRemoveOption(q, i)}
                                            disabled={q.options.length <= 2}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                                            title="Remove Option"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                     </div>
                                  ))}
                                  {q.options.length < 6 && (
                                      <button 
                                        onClick={() => handleAddOption(q)}
                                        className="text-xs text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 mt-2"
                                      >
                                          <Plus className="w-3 h-3" /> Add Option
                                      </button>
                                  )}
                               </div>
                               <div className="pt-2 flex justify-end">
                                  <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded">
                                     <Trash2 className="w-3 h-3" /> Delete Question
                                  </button>
                               </div>
                            </div>
                         ) : (
                            <div>
                               <div className="flex justify-between items-start mb-3">
                                  <div className="flex gap-4 items-start">
                                     <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 mt-1">
                                        <GripVertical className="w-5 h-5" />
                                     </div>
                                     <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                        {idx + 1}
                                     </span>
                                     <div>
                                        {q.imageUrl && (
                                           <div className="mb-2">
                                             <img src={q.imageUrl} alt="Thumbnail" className="h-16 w-auto rounded border border-slate-200 object-cover" />
                                           </div>
                                        )}
                                        <h3 className="font-bold text-slate-800 text-lg leading-snug">{q.text || <span className="text-slate-400 italic">Untitled Question</span>}</h3>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                           {q.options.map((opt, i) => (
                                              <span key={i} className={`text-xs px-2.5 py-1 rounded-md border ${session.type === SessionType.QUIZ && i === q.correctAnswerIndex ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                                                 {opt}
                                              </span>
                                           ))}
                                        </div>
                                     </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => setEditingQId(q.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                     </button>
                                     <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                     </button>
                                  </div>
                               </div>
                            </div>
                         )}
                      </div>
                   ))}
                   
                   {session.questions.length === 0 && (
                      <div className="p-12 text-center text-slate-400">
                         <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                         <p>No questions generated yet.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

// --- MAIN APP COMPONENT --- //

export default function App() {
  const [view, setView] = useState<ViewState>('LANDING');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Storage State
  const [savedSessions, setSavedSessions] = useState<Session[]>([]);

  // Config State
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.QUIZ);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [questionCount, setQuestionCount] = useState(5);
  const [timerMode, setTimerMode] = useState<TimerMode>(TimerMode.PER_QUESTION);
  const [timeValue, setTimeValue] = useState(30);
  
  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  
  // Text Context State
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  // Load drafts on mount
  useEffect(() => {
    const stored = localStorage.getItem('genquiz_sessions');
    if (stored) {
      try {
        setSavedSessions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }, []);

  const saveToStorage = (updatedList: Session[]) => {
    setSavedSessions(updatedList);
    localStorage.setItem('genquiz_sessions', JSON.stringify(updatedList));
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadStatus('uploading');
      
      const isTextFile = file.type === 'text/plain' || file.name.endsWith('.txt');
      
      if (isTextFile) {
          const reader = new FileReader();
          reader.onloadend = () => {
             const text = reader.result as string;
             // Switch to text tab and populate
             setActiveTab('text');
             setPastedText(text);
             setUploadStatus('success');
             // Clear file state just in case
             setUploadedFile(null);
             setTimeout(() => setUploadStatus('idle'), 2000);
          };
          reader.readAsText(file);
      } else {
          // Binary (PDF/Image/Word)
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            setUploadedFile({
              data: base64String,
              mimeType: file.type,
              name: file.name
            });
            // Clear text state
            setPastedText('');
            setUploadStatus('success');
            setTimeout(() => setUploadStatus('idle'), 2000);
          };
          reader.readAsDataURL(file);
      }
    }
  };
  
  const removeUploadedFile = () => {
    setUploadedFile(null);
  }

  const handleCreateSession = async () => {
    const hasText = activeTab === 'text' && pastedText.trim().length > 0;
    const hasFile = activeTab === 'upload' && uploadedFile;
    
    if (!topic.trim() && !hasText && !hasFile) {
      alert("Please enter a topic or provide document context.");
      return;
    }

    setLoading(true);
    try {
      const questions = await generateQuestions({
        topic: topic || (hasFile ? `Analysis of ${uploadedFile?.name}` : "Context Analysis"),
        count: questionCount,
        type: sessionType,
        difficulty: sessionType === SessionType.QUIZ ? difficulty : undefined,
        file: hasFile ? { data: uploadedFile!.data, mimeType: uploadedFile!.mimeType } : undefined,
        textContent: hasText ? pastedText : undefined
      });

      const newSession: Session = {
        id: crypto.randomUUID(),
        hostId: 'host-1',
        joinCode: generateJoinCode(),
        title: topic || (hasFile ? `Analysis of ${uploadedFile?.name}` : "Context Analysis Session"),
        type: sessionType,
        status: 'DRAFT', // Start as Draft
        createdAt: new Date().toISOString(),
        config: {
          topic: topic || "Context Analysis",
          questionCount,
          difficulty: sessionType === SessionType.QUIZ ? difficulty : undefined,
          timerMode,
          timeValue
        },
        questions,
        responses: []
      };
      setSession(newSession);
      setView('EDITOR');
    } catch (e) {
      console.error(e);
      alert('Error creating session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    if (!session) return;
    const updatedList = [session, ...savedSessions.filter(s => s.id !== session.id)];
    saveToStorage(updatedList);
    setView('LANDING');
  };

  const handleLaunch = () => {
    if (!session) return;
    const activeSession = { ...session, status: 'ACTIVE' as const };
    setSession(activeSession);
    const updatedList = [activeSession, ...savedSessions.filter(s => s.id !== session.id)];
    saveToStorage(updatedList);
    
    // Go to Lobby
    setView('SESSION_LOBBY');
  };

  const handleSchedule = () => {
    if (!session) return;
    const scheduledSession = { ...session, status: 'SCHEDULED' as const };
    setSession(scheduledSession);
    const updatedList = [scheduledSession, ...savedSessions.filter(s => s.id !== session.id)];
    saveToStorage(updatedList);
    setView('LANDING'); // Return to dashboard for scheduled
  };

  const handlePreview = () => {
    if (!session) return;
    setView('PREVIEW');
  };

  const handleUpdateSession = (updated: Session) => {
    setSession(updated);
  };

  const handleUpdateSessionTitleInDashboard = (id: string, title: string) => {
    const updatedList = savedSessions.map(s => s.id === id ? { ...s, title } : s);
    saveToStorage(updatedList);
  };

  const openDraft = (s: Session) => {
    setSession(s);
    if (s.status === 'ACTIVE') {
      if (s.hasStarted) {
        setView('SESSION_PLAY');
      } else {
        setView('SESSION_LOBBY');
      }
    } else if (s.status === 'SCHEDULED') {
        // Allow editing of scheduled
        setView('EDITOR');
    } else {
      setView('EDITOR');
    }
  };

  const deleteDraft = (id: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      const updatedList = savedSessions.filter(s => s.id !== id);
      saveToStorage(updatedList);
    }
  };
  
  const handleStartFromLobby = () => {
    if (!session) return;
    const startedSession = { ...session, hasStarted: true };
    setSession(startedSession);
    
    const updatedList = [startedSession, ...savedSessions.filter(s => s.id !== session.id)];
    saveToStorage(updatedList);

    setView('SESSION_PLAY');
  };

  // --- Export Logic ---
  const handleExportPDF = () => {
    if (!session) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Results: ${session.title}`, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Questions: ${session.questions.length}`, 14, 36);

    // If no responses, add a mock table
    const data = session.responses.length > 0 
      ? session.responses.map(r => [r.participantName, r.score, r.submittedAt])
      : [["Demo Guest", "80%", "10:00 AM"], ["Jane Doe", "65%", "10:02 AM"]]; // Demo Data

    autoTable(doc, {
      head: [['Participant', 'Score', 'Time']],
      body: data,
      startY: 45,
    });
    
    doc.save(`${session.title.replace(/\s+/g, '_')}_results.pdf`);
  };

  const Navbar = () => (
    <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div 
        className="flex items-center gap-2 text-indigo-600 font-bold text-xl cursor-pointer"
        onClick={() => setView('LANDING')}
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
          <Play className="w-5 h-5 fill-current" />
        </div>
        GenQuiz.ai
      </div>
      <div className="flex gap-4">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer">
          <Settings className="w-4 h-4" />
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
          JD
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      {/* --- LANDING VIEW --- */}
      {view === 'LANDING' && (
        <main className="max-w-6xl mx-auto p-6 mt-10 animate-fade-in">
          <div className="mb-12 text-center">
             <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
               Engage your audience with <span className="text-indigo-600">AI-powered</span> interactive sessions
             </h1>
             <p className="text-xl text-slate-500 max-w-2xl mx-auto">
               Create quizzes and polls in seconds using Gemini AI. Host live sessions or schedule them for later.
             </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
            {/* Host Card */}
            <div 
              onClick={() => {
                setTopic('');
                setSessionType(SessionType.QUIZ);
                setView('CREATE_WIZARD');
              }}
              className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer group border border-transparent hover:border-indigo-100"
            >
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">Host a Session</h2>
              <p className="text-slate-600 mb-6">
                Generate a new quiz or poll from any topic using AI. Perfect for classrooms, meetings, or trivia nights.
              </p>
              <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
                Start Creating <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>

            {/* Join Card */}
            <div 
              className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer group border border-transparent hover:border-emerald-100"
              onClick={() => alert("Join functionality coming soon in this demo!")}
            >
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600 transition-colors">Join a Session</h2>
              <p className="text-slate-600 mb-6">
                Have a game code? Enter it here to join a live session hosted by someone else.
              </p>
              <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-1 transition-transform">
                Enter Code <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </div>

          {/* Drafts / History Section */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Your Sessions
            </h3>
            
            {savedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400">
                 <Calendar className="w-8 h-8 mb-2 opacity-50" />
                 <p>No saved sessions</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedSessions.map(s => (
                  <SessionCard 
                    key={s.id} 
                    session={s} 
                    onOpen={openDraft} 
                    onDelete={deleteDraft} 
                    onUpdateTitle={handleUpdateSessionTitleInDashboard}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* --- CREATE WIZARD VIEW --- */}
      {view === 'CREATE_WIZARD' && (
        <main className="max-w-2xl mx-auto p-6 mt-6">
          <button 
            onClick={() => setView('LANDING')}
            className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Home
          </button>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-indigo-600 p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">Create New Session</h1>
              <p className="text-indigo-100">Configure your AI-generated session details.</p>
            </div>
            
            <div className="p-8 space-y-8">
              
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Session Type</label>
                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                  <button
                    onClick={() => setSessionType(SessionType.QUIZ)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      sessionType === SessionType.QUIZ 
                        ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    Quiz
                  </button>
                  <button
                    onClick={() => setSessionType(SessionType.POLL)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      sessionType === SessionType.POLL 
                        ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Poll
                  </button>
                </div>
              </div>

              {/* Upload / Text Area */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                   Context Source <span className="text-slate-400 font-normal ml-1">(Optional)</span>
                </label>
                
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                   <div className="flex border-b border-slate-200">
                      <button 
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                         <Upload className="w-4 h-4" /> Upload Document
                      </button>
                      <button 
                        onClick={() => setActiveTab('text')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'text' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                         <AlignLeft className="w-4 h-4" /> Paste Text
                      </button>
                   </div>
                   
                   <div className="p-4 bg-white min-h-[160px]">
                      {activeTab === 'upload' && (
                        <>
                           {!uploadedFile ? (
                              <label className={`cursor-pointer flex flex-col items-center justify-center gap-2 text-slate-500 py-6 border-2 border-dashed rounded-xl transition-all ${uploadStatus === 'uploading' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                                {uploadStatus === 'uploading' ? (
                                   <div className="flex flex-col items-center animate-pulse">
                                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                                      <span className="text-sm font-bold text-indigo-600">Processing file...</span>
                                   </div>
                                ) : (
                                   <>
                                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                                        <File className="w-5 h-5" />
                                      </div>
                                      <div className="text-center">
                                        <span className="font-bold text-indigo-600 hover:underline">Click to upload</span>
                                        <p className="text-xs text-slate-400 mt-1">PDF, Word, Text or Images (up to 20MB)</p>
                                      </div>
                                   </>
                                )}
                                <input 
                                  type="file" 
                                  disabled={uploadStatus === 'uploading'}
                                  accept="image/*,application/pdf,.pdf,.doc,.docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                                  onChange={handleFileUpload}
                                  className="hidden" 
                                />
                              </label>
                            ) : (
                              <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100 animate-fade-in">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-10 h-10 bg-white text-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                     <CheckCircle className="w-6 h-6 text-green-500" />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-sm font-bold text-slate-800 truncate">{uploadedFile.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      {uploadedFile.mimeType} <span className="text-green-600 font-bold">• Ready</span>
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={removeUploadedFile}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  title="Remove file"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                        </>
                      )}
                      
                      {activeTab === 'text' && (
                        <div className="h-full">
                           <textarea
                             value={pastedText}
                             onChange={(e) => setPastedText(e.target.value)}
                             placeholder="Paste your article, notes, or content here..."
                             className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none resize-none text-sm"
                           />
                           <div className="flex justify-end mt-2">
                              <span className="text-xs text-slate-400">
                                {pastedText.length} characters
                              </span>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Topic Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Topic</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={(activeTab === 'upload' && uploadedFile) || (activeTab === 'text' && pastedText) ? "e.g. Focus on key terms (Optional)" : "e.g. 'Advanced Physics', '90s Pop Music'"}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Difficulty (Quiz Only) */}
                {sessionType === SessionType.QUIZ && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty</label>
                    <select 
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 outline-none bg-white"
                    >
                      {Object.values(Difficulty).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Questions: <span className="text-indigo-600">{questionCount}</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max={QUESTION_COUNT_OPTIONS.length - 1}
                    step="1"
                    value={QUESTION_COUNT_OPTIONS.indexOf(questionCount)}
                    onChange={(e) => setQuestionCount(QUESTION_COUNT_OPTIONS[parseInt(e.target.value)])}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{QUESTION_COUNT_OPTIONS[0]}</span>
                    <span>{QUESTION_COUNT_OPTIONS[QUESTION_COUNT_OPTIONS.length - 1]}</span>
                  </div>
                </div>
              </div>

              {/* Timer Settings */}
              <div className="border-t border-slate-100 pt-6">
                 <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                   <Clock className="w-4 h-4" /> Timer Settings
                 </h3>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <select 
                        value={timerMode}
                        onChange={(e) => {
                            const newMode = e.target.value as TimerMode;
                            setTimerMode(newMode);
                            if (newMode === TimerMode.WHOLE_QUIZ && timeValue < 60) setTimeValue(300);
                            if (newMode === TimerMode.PER_QUESTION && timeValue > 300) setTimeValue(30);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none bg-white"
                      >
                        <option value={TimerMode.PER_QUESTION}>Per Question</option>
                        <option value={TimerMode.WHOLE_QUIZ}>Total Limit</option>
                        <option value={TimerMode.NONE}>No Timer</option>
                      </select>
                    </div>
                    {timerMode !== TimerMode.NONE && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={timerMode === TimerMode.WHOLE_QUIZ ? Math.floor(timeValue / 60) : timeValue}
                          onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setTimeValue(timerMode === TimerMode.WHOLE_QUIZ ? val * 60 : val);
                          }}
                          className="w-20 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
                        />
                        <span className="text-sm text-slate-500">
                            {timerMode === TimerMode.WHOLE_QUIZ ? 'minutes' : 'seconds'}
                        </span>
                      </div>
                    )}
                 </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleCreateSession}
                disabled={loading || (!topic && !uploadedFile && !pastedText)}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all mt-4 ${
                   loading || (!topic && !uploadedFile && !pastedText) ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-6 h-6" />
                    Generating with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Generate Session
                  </>
                )}
              </button>

            </div>
          </div>
        </main>
      )}

      {/* --- EDITOR VIEW --- */}
      {view === 'EDITOR' && session && (
        <EditorView 
          session={session}
          onUpdate={handleUpdateSession}
          onSaveDraft={handleSaveDraft}
          onLaunch={handleLaunch}
          onSchedule={handleSchedule}
          onPreview={handlePreview}
          onBack={() => setView('LANDING')}
        />
      )}

      {/* --- PREVIEW VIEW (Uses PlayView) --- */}
      {view === 'PREVIEW' && session && (
        <PlayView 
          session={session} 
          onUpdateSession={() => {}} // No updates in preview
          onSubmit={() => setView('EDITOR')} 
          isHost={false} 
          isPreview={true}
          onExitPreview={() => setView('EDITOR')}
        />
      )}

      {/* --- LOBBY VIEW --- */}
      {view === 'SESSION_LOBBY' && session && (
        <LobbyView 
          session={session} 
          onStart={handleStartFromLobby} 
          onBack={() => setView('LANDING')} 
        />
      )}

      {/* --- PLAY VIEW (Live) --- */}
      {view === 'SESSION_PLAY' && session && (
        <PlayView 
          session={session} 
          onUpdateSession={handleUpdateSession}
          onSubmit={() => setView('RESULTS')} 
          isHost={true} 
        />
      )}

      {view === 'RESULTS' && session && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-lg w-full">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Session Completed!</h2>
            <p className="text-slate-500 mb-8">The session has ended successfully. In a real app, you would see leaderboards and detailed analytics here.</p>
            <div className="flex flex-col gap-4 justify-center">
              <button 
                onClick={handleExportPDF}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Export Results (PDF)
              </button>
              <div className="flex gap-4">
                <button 
                  onClick={() => setView('LANDING')}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Back Home
                </button>
                <button 
                  onClick={() => setView('CREATE_WIZARD')}
                  className="flex-1 py-3 border border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  Create New
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}