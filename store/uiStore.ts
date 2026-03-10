import { create } from 'zustand';
import { ActivePanel, ShapeType } from '../types';

interface UIState {
  view: 'editor' | 'drive';
  setView: (view: 'editor' | 'drive') => void;

  activePanel: ActivePanel | null;
  setActivePanel: (panel: ActivePanel | null) => void;

  isSourceCodeVisible: boolean;
  setIsSourceCodeVisible: (visible: boolean) => void;

  isWordCountVisible: boolean;
  setIsWordCountVisible: (visible: boolean) => void;

  isSavePromptVisible: boolean;
  setIsSavePromptVisible: (visible: boolean) => void;

  isCommentsSidebarVisible: boolean;
  setIsCommentsSidebarVisible: (visible: boolean) => void;

  isSpecialCharVisible: boolean;
  setIsSpecialCharVisible: (visible: boolean) => void;

  isCommentModalVisible: boolean;
  setIsCommentModalVisible: (visible: boolean) => void;

  isAiSidekickVisible: boolean;
  setIsAiSidekickVisible: (visible: boolean) => void;

  isPageSetupVisible: boolean;
  setIsPageSetupVisible: (visible: boolean) => void;

  isPreviewModalVisible: boolean;
  setIsPreviewModalVisible: (visible: boolean) => void;

  isAboutModalVisible: boolean;
  setIsAboutModalVisible: (visible: boolean) => void;

  isShortcutsSidebarVisible: boolean;
  setIsShortcutsSidebarVisible: (visible: boolean) => void;

  isImportModalVisible: boolean;
  setIsImportModalVisible: (visible: boolean) => void;

  isDrawingModalVisible: boolean;
  setIsDrawingModalVisible: (visible: boolean) => void;

  isCropModalVisible: boolean;
  setIsCropModalVisible: (visible: boolean) => void;

  isTemplatesModalVisible: boolean;
  setIsTemplatesModalVisible: (visible: boolean) => void;

  isMathModalVisible: boolean;
  setIsMathModalVisible: (visible: boolean) => void;

  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  toast: string | null;
  setToast: (toast: string | null) => void;
  showToast: (message: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'editor',
  setView: (view) => set({ view }),

  activePanel: null,
  setActivePanel: (activePanel) => set({ activePanel }),

  isSourceCodeVisible: false,
  setIsSourceCodeVisible: (isSourceCodeVisible) => set({ isSourceCodeVisible }),

  isWordCountVisible: false,
  setIsWordCountVisible: (isWordCountVisible) => set({ isWordCountVisible }),

  isSavePromptVisible: false,
  setIsSavePromptVisible: (isSavePromptVisible) => set({ isSavePromptVisible }),

  isCommentsSidebarVisible: false,
  setIsCommentsSidebarVisible: (isCommentsSidebarVisible) => set({ isCommentsSidebarVisible }),

  isSpecialCharVisible: false,
  setIsSpecialCharVisible: (isSpecialCharVisible) => set({ isSpecialCharVisible }),

  isCommentModalVisible: false,
  setIsCommentModalVisible: (isCommentModalVisible) => set({ isCommentModalVisible }),

  isAiSidekickVisible: false,
  setIsAiSidekickVisible: (isAiSidekickVisible) => set({ isAiSidekickVisible }),

  isPageSetupVisible: false,
  setIsPageSetupVisible: (isPageSetupVisible) => set({ isPageSetupVisible }),

  isPreviewModalVisible: false,
  setIsPreviewModalVisible: (isPreviewModalVisible) => set({ isPreviewModalVisible }),

  isAboutModalVisible: false,
  setIsAboutModalVisible: (isAboutModalVisible) => set({ isAboutModalVisible }),

  isShortcutsSidebarVisible: false,
  setIsShortcutsSidebarVisible: (isShortcutsSidebarVisible) => set({ isShortcutsSidebarVisible }),

  isImportModalVisible: false,
  setIsImportModalVisible: (isImportModalVisible) => set({ isImportModalVisible }),

  isDrawingModalVisible: false,
  setIsDrawingModalVisible: (isDrawingModalVisible) => set({ isDrawingModalVisible }),

  isCropModalVisible: false,
  setIsCropModalVisible: (isCropModalVisible) => set({ isCropModalVisible }),

  isTemplatesModalVisible: false,
  setIsTemplatesModalVisible: (isTemplatesModalVisible) => set({ isTemplatesModalVisible }),

  isMathModalVisible: false,
  setIsMathModalVisible: (isMathModalVisible) => set({ isMathModalVisible }),

  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  toast: null,
  setToast: (toast) => set({ toast }),
  showToast: (message) => {
    set({ toast: message });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));
