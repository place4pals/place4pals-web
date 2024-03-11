import * as API from "aws-amplify/api";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { emptyUuid, useGlobalStore } from "#src/utils";
import { ModalEditorComponent, PostComponent } from "#src/components";
import { FaArrowLeft } from "react-icons/fa";
const apiClient = API.generateClient();

export const Post = () => {
    const messagesRef = useRef(null);
    const [editPost, setEditPost] = useState(null);
    const { postId } = useParams();
    const authenticated = useGlobalStore(state => state.authenticated);
    const navigate = useNavigate();

    const sharedPostAttributes = `
        id created_at name content media
        user { id username picture moderator } 
        totalComments: comments_aggregate { a: aggregate { a: count } } 
        totalLikes: likes_aggregate { a: aggregate { a: count } }
        userLiked: likes(where: {user_id: {_eq: $userId}}) { id }
    `;

    const { data: post } = useQuery({
        queryKey: ["posts", authenticated, postId],
        queryFn: async () => postId ? (await apiClient.graphql({
            query: `query($postId: uuid!, $userId: uuid){posts_by_pk(id: $postId) { 
                ${sharedPostAttributes}
                comments(order_by: {created_at: desc}) {
                    id created_at content
                    user { id username picture moderator } 
                    totalLikes: likes_aggregate { a: aggregate { a: count } }
                    userLiked: likes(where: {user_id: {_eq: $userId}}) { id }
                }
            } }`,
            variables: { postId, userId: !authenticated ? emptyUuid : authenticated }
        }))?.data?.posts_by_pk : null,
    });

    return (
        <>
            <div className={`flex flex-col justify-start gap-4 relative h-full`}>
                <div className={`flex flex-col gap-2 h-full`}>
                    <div ref={messagesRef} className={`overflow-y-scroll flex flex-col h-full pt-[35px]`}>
                        <div onClick={() => navigate(-1)} className="absolute z-10 top-0 px-3 py-3 bg-background w-[calc(100%_-_20px)] text-subtitle hover:text-text flex flex-row gap-2 items-center cursor-pointer"><FaArrowLeft />Go back</div>
                        {post &&
                            <PostComponent
                                reply
                                post={post}
                                setEditPost={setEditPost}
                            />}
                    </div>
                </div>
            </div>
            <ModalEditorComponent
                editPost={editPost}
                setEditPost={setEditPost}
            />
        </>
    )
};