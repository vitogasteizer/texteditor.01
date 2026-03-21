
import React, { useState, useCallback } from 'react';
import { CloseIcon, MathIcon } from './icons/EditorIcons';

interface CalculatorModalProps {
  isVisible: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

const CalculatorModal: React.FC<CalculatorModalProps> = ({ isVisible, onClose, t }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  // Use refs to access current state in the keyboard listener without re-attaching it
  const displayRef = React.useRef(display);
  const equationRef = React.useRef(equation);
  
  React.useEffect(() => {
    displayRef.current = display;
    equationRef.current = equation;
  }, [display, equation]);

  const handleDigit = useCallback((digit: string) => {
    setDisplay(prev => prev === '0' ? digit : prev + digit);
  }, []);

  const handleOperator = useCallback((op: string) => {
    setEquation(displayRef.current + ' ' + op + ' ');
    setDisplay('0');
  }, []);

  const calculate = useCallback(() => {
    try {
      const fullEquation = equationRef.current + displayRef.current;
      if (!fullEquation.trim()) return;
      
      // Sanitize input: only allow numbers and operators
      const sanitized = fullEquation.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/. ]/g, '');
      
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      
      if (result === Infinity || result === -Infinity || isNaN(result)) {
        setDisplay('Error');
      } else {
        setDisplay(Number(result.toFixed(8)).toString());
      }
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  }, []);

  const clear = useCallback(() => {
    setDisplay('0');
    setEquation('');
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      let handled = false;

      if (key >= '0' && key <= '9') {
        handleDigit(key);
        handled = true;
      } else if (key === '.') {
        if (!displayRef.current.includes('.')) {
          setDisplay(prev => prev + '.');
          handled = true;
        }
      } else if (key === '+' || key === '-') {
        handleOperator(key);
        handled = true;
      } else if (key === '*') {
        handleOperator('×');
        handled = true;
      } else if (key === '/') {
        handleOperator('÷');
        handled = true;
      } else if (key === 'Enter' || key === '=') {
        calculate();
        handled = true;
      } else if (key === 'Escape') {
        onClose();
        handled = true;
      } else if (key === 'Backspace') {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
        handled = true;
      } else if (key.toLowerCase() === 'c') {
        clear();
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isVisible, handleDigit, handleOperator, calculate, clear, onClose]);

  if (!isVisible) return null;

  const buttons = [
    { label: 'C', onClick: clear, className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
    { label: '÷', onClick: () => handleOperator('÷'), className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: '×', onClick: () => handleOperator('×'), className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'DEL', onClick: () => setDisplay(display.length > 1 ? display.slice(0, -1) : '0'), className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    
    { label: '7', onClick: () => handleDigit('7') },
    { label: '8', onClick: () => handleDigit('8') },
    { label: '9', onClick: () => handleDigit('9') },
    { label: '-', onClick: () => handleOperator('-'), className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    
    { label: '4', onClick: () => handleDigit('4') },
    { label: '5', onClick: () => handleDigit('5') },
    { label: '6', onClick: () => handleDigit('6') },
    { label: '+', onClick: () => handleOperator('+'), className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    
    { label: '1', onClick: () => handleDigit('1') },
    { label: '2', onClick: () => handleDigit('2') },
    { label: '3', onClick: () => handleDigit('3') },
    { label: '=', onClick: calculate, className: 'row-span-2 bg-blue-600 text-white hover:bg-blue-700' },
    
    { label: '0', onClick: () => handleDigit('0'), className: 'col-span-2' },
    { label: '.', onClick: () => !display.includes('.') && setDisplay(display + '.') },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-[320px] overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
        <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <MathIcon className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{t('calculator.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 text-right space-y-1">
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono h-4 overflow-hidden truncate">
              {equation}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-mono truncate">
              {display}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {buttons.map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                className={`p-4 text-sm font-bold rounded-2xl transition-all active:scale-95 hover:brightness-95 ${btn.className || 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorModal;
