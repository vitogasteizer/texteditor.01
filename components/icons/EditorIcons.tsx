
import React from 'react';
import * as Lucide from 'lucide-react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  isMenuIcon?: boolean;
  size?: number;
}

const defaultClass = "w-5 h-5";
const menuClass = "w-4 h-4 mr-2";

const createIcon = (LucideIcon: React.ElementType) => {
  const IconComponent: React.FC<IconProps> = ({ className, isMenuIcon, size, ...props }) => {
    const sizeStyle = size ? { width: size, height: size } : {};
    return (
      <LucideIcon
        className={className || (isMenuIcon ? menuClass : defaultClass)}
        style={sizeStyle}
        {...props}
      />
    );
  };
  return IconComponent;
};

// --- Editor Formatting ---
export const BoldIcon = createIcon(Lucide.Bold);
export const ItalicIcon = createIcon(Lucide.Italic);
export const UnderlineIcon = createIcon(Lucide.Underline);
export const StrikethroughIcon = createIcon(Lucide.Strikethrough);
export const TextColorIcon = createIcon(Lucide.Baseline);
export const BgColorIcon = createIcon(Lucide.Highlighter);
export const TextShadowIcon = createIcon(Lucide.Type);
export const ClearFormattingIcon = createIcon(Lucide.RemoveFormatting);
export const PaintBrushIcon = createIcon(Lucide.Paintbrush);

// --- Lists & Alignment ---
export const ListOrderedIcon = createIcon(Lucide.ListOrdered);
export const ListUnorderedIcon = createIcon(Lucide.List);
export const ChecklistIcon = createIcon(Lucide.ListTodo);
export const AlignLeftIcon = createIcon(Lucide.AlignLeft);
export const AlignCenterIcon = createIcon(Lucide.AlignCenter);
export const AlignRightIcon = createIcon(Lucide.AlignRight);
export const AlignJustifyIcon = createIcon(Lucide.AlignJustify);
export const LineHeightIcon = createIcon(Lucide.ArrowUpDown);

// --- UI Controls ---
export const MenuIcon = createIcon(Lucide.Menu);
export const CloseIcon = createIcon(Lucide.X);
export const ChevronDownIcon = createIcon(Lucide.ChevronDown);
export const ChevronRightIcon = createIcon(Lucide.ChevronRight);
export const ArrowLeftIcon = createIcon(Lucide.ArrowLeft);
export const SearchIcon = createIcon(Lucide.Search);
export const ZoomInIcon = createIcon(Lucide.ZoomIn);
export const ZoomOutIcon = createIcon(Lucide.ZoomOut);
export const MoreVerticalIcon = createIcon(Lucide.MoreVertical);
export const GridViewIcon = createIcon(Lucide.LayoutGrid);
export const ListViewIcon = createIcon(Lucide.List);
export const EyeIcon = createIcon(Lucide.Eye);
export const MaximizeIcon = createIcon(Lucide.Maximize);
export const InfoIcon = createIcon(Lucide.Info);
export const SettingsIcon = createIcon(Lucide.Settings);

// --- File & Actions ---
export const FilePlusIcon = createIcon(Lucide.FilePlus);
export const FileTextIcon = createIcon(Lucide.FileText);
export const SaveIcon = createIcon(Lucide.Save);
export const FolderIcon = createIcon(Lucide.Folder);
export const UploadCloudIcon = createIcon(Lucide.CloudUpload);
export const CloudIcon = createIcon(Lucide.Cloud);
export const LocalStorageIcon = createIcon(Lucide.HardDrive);
export const DownloadIcon = createIcon(Lucide.Download);
export const PrinterIcon = createIcon(Lucide.Printer);
export const UndoIcon = createIcon(Lucide.Undo);
export const RedoIcon = createIcon(Lucide.Redo);
export const Trash2Icon = createIcon(Lucide.Trash2);
export const TrashIcon = createIcon(Lucide.Trash);
export const EditIcon = createIcon(Lucide.Edit);
export const CopyIcon = createIcon(Lucide.Copy);
export const ClipboardIcon = createIcon(Lucide.Clipboard);
export const ScissorsIcon = createIcon(Lucide.Scissors);
export const SelectAllIcon = createIcon(Lucide.MousePointerSquareDashed);
export const PdfIcon = createIcon(Lucide.FileText);

// --- Insert Objects ---
export const LinkIcon = createIcon(Lucide.Link);
export const LinkOffIcon = createIcon(Lucide.Link2Off);
export const ImageIcon = createIcon(Lucide.Image);
export const TableIcon = createIcon(Lucide.Table);
export const SquareIcon = createIcon(Lucide.Square);
export const CircleIcon = createIcon(Lucide.Circle);
export const TriangleIcon = createIcon(Lucide.Triangle);
export const SlashIcon = createIcon(Lucide.Slash);
export const TypeIcon = createIcon(Lucide.Type);
export const MinusIcon = createIcon(Lucide.Minus);
export const SplitSquareVerticalIcon = createIcon(Lucide.SplitSquareVertical);
export const OmegaIcon = createIcon(Lucide.Omega);
export const MessageSquareIcon = createIcon(Lucide.MessageSquare);
export const PencilIcon = createIcon(Lucide.Pencil);
export const EraserIcon = createIcon(Lucide.Eraser);
export const MathIcon = createIcon(Lucide.Calculator);

// --- Table Operations ---
export const RowInsertTopIcon = createIcon(Lucide.ArrowUpToLine);
export const RowInsertBottomIcon = createIcon(Lucide.ArrowDownToLine);
export const ColumnInsertLeftIcon = createIcon(Lucide.ArrowLeftToLine);
export const ColumnInsertRightIcon = createIcon(Lucide.ArrowRightToLine);
export const MergeCellsIcon = createIcon(Lucide.Combine);
export const SplitCellIcon = createIcon(Lucide.Split);

// --- AI & Extra Tools ---
export const SparklesIcon = createIcon(Lucide.Sparkles);
export const BotIcon = createIcon(Lucide.Bot);
export const MicIcon = createIcon(Lucide.Mic);
export const StopCircleIcon = createIcon(Lucide.StopCircle);
export const Volume2Icon = createIcon(Lucide.Volume2);
export const BookTextIcon = createIcon(Lucide.BookText);
export const Wand2Icon = createIcon(Lucide.Wand2);
export const LanguagesIcon = createIcon(Lucide.Languages);
export const SmileIcon = createIcon(Lucide.Smile);
export const PenLineIcon = createIcon(Lucide.PenLine);
export const BrainCircuitIcon = createIcon(Lucide.BrainCircuit);
export const MapIcon = createIcon(Lucide.Map);
export const SendIcon = createIcon(Lucide.Send);
export const CodeIcon = createIcon(Lucide.Code);
export const BarChartIcon = createIcon(Lucide.BarChart);
export const KeyboardIcon = createIcon(Lucide.Keyboard);
export const RectangleVerticalIcon = createIcon(Lucide.RectangleVertical);
export const RectangleHorizontalIcon = createIcon(Lucide.RectangleHorizontal);
export const LanguageIcon = createIcon(Lucide.Globe);
export const SunIcon = createIcon(Lucide.Sun);
export const MoonIcon = createIcon(Lucide.Moon);
