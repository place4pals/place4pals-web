import { FaBold, FaItalic, FaList, FaListOl, FaUnderline } from "react-icons/fa";

export const ToolbarComponent = ({ editor, editorType, onFileChange }) => {
    return (
        <div className="flex flex-row gap-2">
            <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={editor?.isActive('bold') ? 'text-select' : ''}
            >
                <FaBold />
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={editor?.isActive('italic') ? 'text-select' : ''}
            >
                <FaItalic />
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={editor?.isActive('underline') ? 'text-select' : ''}
            >
                <FaUnderline />
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={editor?.isActive('bulletList') ? 'text-select' : ''}
            >
                <FaList />
            </button>
            <button
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={editor?.isActive('orderedList') ? 'text-select' : ''}
            >
                <FaListOl />
            </button>
            <label
                htmlFor="file"
                className="cursor-pointer hover:opacity-50"
                onClick={() => editor?.chain().focus().toggleBold().run()}
            >{`📸`}
                <input id="file" name={editorType} type="file" className="hidden" onChange={onFileChange} />
            </label>
        </div>
    )
}