import * as API from "aws-amplify/api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from "@tiptap/extension-placeholder";
import FileHandler from "@tiptap-pro/extension-file-handler";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { compressImage, useGlobalStore } from "#src/utils";
import { ToolbarComponent, Modal } from "#src/components";
const apiClient = API.generateClient();

export const ModalEditorComponent = ({ editPost, setEditPost }) => {
    const setLoading = useGlobalStore(state => state.setLoading);
    const queryClient = useQueryClient();
    const [giphyOpen, setGiphyOpen] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);

    const modalEditor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: { HTMLAttributes: { class: "list-disc" } },
                orderedList: { HTMLAttributes: { class: "list-decimal" } },
            }),
            Placeholder.configure({
                placeholder: 'Type your message here...',
            }),
            FileHandler,
            Image,
            Underline,
            Link,
            Typography,
        ],
    });

    const onFileChange = async (e) => {
        if (!e?.target?.files?.[0]) return;
        setLoading(true);
        try {
            const base64 = await compressImage({ file: e?.target?.files?.[0] });
            const key = await (await API.post({ apiName: 'auth', path: '/uploadImage', options: { body: { base64 } } }).response).body.json();
            modalEditor?.commands.setImage({ src: `${import.meta.env.VITE_FILES_URL}/${key}` });
            setLoading(false);
        }
        catch (err) {
            console.log(err);
            setLoading(false);
        }
    }

    const editSaveChanges = async () => {
        const content = modalEditor?.getHTML();
        if (!content || content === '<p></p>') {
            alert(`You cannot add an empty reply`);
            return;
        }
        setLoading(true);
        // We are editing a post
        await apiClient.graphql({
            query: `mutation($id: uuid!, $content: String) { update_posts_by_pk(pk_columns: {id: $id}, _set: {content: $content}) { id } }`,
            variables: { id: editPost.id, content },
        });
        await queryClient.refetchQueries(["posts"]);
        setLoading(false);
        setEditPost(false);
    }

    const addGiphy = async (gif) => {
        setGiphyOpen(false);
        modalEditor?.commands.setImage({ src: gif.images.original.url });
    }

    const addEmoji = async (emoji) => {
        setEmojiOpen(false);
        modalEditor?.commands.insertContent(emoji.native);
    }

    useEffect(() => {
        if (editPost) {
            modalEditor?.commands.setContent(editPost.content);
        }
    }, [editPost]);

    return (
        <Modal open={editPost} setOpen={setEditPost}>
            <div className="flex flex-col gap-2 items-start pt-2 pb-1 w-full">
                <div className="text-xl pb-2">
                    {`Edit Post`}
                </div>
                <div className="flex flex-col gap-2 justify-between bg-background rounded-xl p-2 mt-2 w-full">
                    <ToolbarComponent
                        editor={modalEditor}
                        editorType='modal'
                        setGiphyOpen={setGiphyOpen}
                        setEmojiOpen={setEmojiOpen}
                        onFileChange={onFileChange}
                    />
                    <div className="flex flex-row gap-2 items-end pt-2 pb-1">
                        <EditorContent
                            className="w-full h-40 overflow-y-scroll"
                            editor={modalEditor}
                        />
                    </div>
                </div>
                <div className="flex flex-row gap-2 justify-end w-full py-2">
                    <button onClick={() => editSaveChanges()} className=" h-6 p-4 gap-1 flex flex-row justify-center items-center rounded-md text-white bg-green hover:opacity-50">
                        <span>{`Save Changes`}</span>
                    </button>
                </div>
            </div>
        </Modal>
    )
}