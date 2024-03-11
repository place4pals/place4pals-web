import * as API from "aws-amplify/api";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from "@tiptap/extension-placeholder";
import FileHandler from "@tiptap-pro/extension-file-handler";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { compressImage, useGlobalStore } from "#src/utils";
import { ToolbarComponent } from "#src/components";
import { useParams } from "react-router-dom";
const apiClient = API.generateClient();

export const InlineEditorComponent = ({ placeholder = `Type a comment...`, autofocus = false, postId: postIdProp = null }) => {
    const darkMode = useGlobalStore(state => state.darkMode);
    const authenticated = useGlobalStore(state => state.authenticated);
    const setLoading = useGlobalStore(state => state.setLoading);
    const queryClient = useQueryClient();
    const [giphyOpen, setGiphyOpen] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const { id: postIdParam } = useParams();
    const postId = postIdProp ?? postIdParam;

    const inlineEditor = useEditor({
        autofocus,
        extensions: [
            StarterKit.configure({
                bulletList: { HTMLAttributes: { class: "list-disc" } },
                orderedList: { HTMLAttributes: { class: "list-decimal" } },
            }),
            Placeholder.configure({ placeholder }),
            FileHandler,
            Image,
            Underline,
            Link,
            Typography,
        ],
    });

    const addReply = async () => {
        const content = inlineEditor?.getHTML();
        if (!content || content === '<p></p>') {
            alert(`You cannot add an empty reply`);
            return;
        }
        setLoading(true);

        const parentPostIdChoices = postId ? (await apiClient.graphql({
            query: `query($postId: uuid!) {posts_by_pk(id:$postId) {id parent_post_id}}`,
            variables: { postId },
        })).data.posts_by_pk : null;
        const parentPostId = parentPostIdChoices?.parent_post_id ?? parentPostIdChoices?.id;

        await apiClient.graphql({
            query: `mutation($postId: uuid, $parentPostId: uuid, $content: String) 
            {insert_posts_one(object: {post_id: $postId, parent_post_id: $parentPostId, content: $content}) {id}}`,
            variables: { postId, parentPostId, content },
        });
        await queryClient.refetchQueries(["posts", authenticated, postIdParam]);
        inlineEditor?.commands.setContent('');
        setLoading(false);
    };

    const onFileChange = async (e) => {
        if (!e?.target?.files?.[0]) return;
        setLoading(true);
        try {
            const base64 = await compressImage({ file: e?.target?.files?.[0] });
            const key = await (await API.post({ apiName: 'auth', path: '/uploadImage', options: { body: { base64 } } }).response).body.json();
            inlineEditor?.commands.setImage({ src: `${import.meta.env.VITE_FILES_URL}/${key}` });
            setLoading(false);
        }
        catch (err) {
            console.log(err);
            setLoading(false);
        }
    }

    const addGiphy = async (gif) => {
        setGiphyOpen(false);
        inlineEditor?.commands.setImage({ src: gif.images.original.url });
    }

    const addEmoji = async (emoji) => {
        setEmojiOpen(false);
        inlineEditor?.commands.insertContent(emoji.native);
    }

    return (
        <div className="flex flex-col gap-4 p-4 border-b-[1px] border-border">
            <div className="min-h-[24px]">
                <EditorContent
                    className="w-full"
                    editor={inlineEditor}
                />
            </div>
            <div className="flex flex-row justify-between">
                <ToolbarComponent
                    editor={inlineEditor}
                    editorType='comment'
                    setGiphyOpen={setGiphyOpen}
                    setEmojiOpen={setEmojiOpen}
                    onFileChange={onFileChange}
                />
                <button onClick={() => addReply()} className="w-[60px] h-[20px] hover:opacity-50 bg-card rounded-xl border-[1px] border-border">
                    <img src={`/send_${darkMode ? 'dark' : 'light'}.png`} />
                </button>
            </div>
        </div>
    )
}