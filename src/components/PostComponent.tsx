import { styles, useGlobalStore } from "#src/utils";
import { FaCheck } from "react-icons/fa";
import { Link } from "react-router-dom";
import * as API from "aws-amplify/api";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
const apiClient = API.generateClient();

export const PostComponent = ({ post, reply: replyDefault = false, setEditPost }) => {
    const queryClient = useQueryClient();
    const setLoading = useGlobalStore(state => state.setLoading);
    const [hide, setHide] = useState(false);

    const likePost = async () => {
        if (post?.userLiked?.[0]?.id) {
            await apiClient.graphql({
                query: `mutation($likedId: uuid!) {delete_likes_by_pk(id: $likedId) { id }}`,
                variables: { likedId: post?.userLiked?.[0]?.id },
            });
            await queryClient.refetchQueries(['posts']);
        }
        else {
            await apiClient.graphql({
                query: `mutation($postId: uuid) {insert_likes_one(object: {post_id: $postId}) {id}}`,
                variables: { postId: post?.id },
            });
            await queryClient.refetchQueries(["posts"]);
        }
    }

    const deletePost = async () => {
        if (confirm('Are you sure you want to delete this post?')) {
            setLoading(true);
            try {
                await apiClient.graphql({
                    query: `mutation($id: uuid!) {delete_posts_by_pk(id: $id) { id }}`,
                    variables: { id: post?.id },
                });
                await queryClient.refetchQueries(['posts']);
                setLoading(false);
            }
            catch (err) {
                console.log(err);
                setLoading(false);
            }
        }
    }

    return (<>
        <Link className={`${styles.container} hover:bg-background my-4`} to={`/posts/${post?.id?.replaceAll('-', '')}`}>
            <div className="flex flex-row gap-1 justify-between pr-2 py-1">
                <Link to={`/users/${post?.user?.username}`} className="font-bold text-select flex flex-row items-center gap-1">
                    <img className="w-8 h-8 sm:h-6 sm:w-6 rounded-full inline-flex" src={post?.user?.picture ? `${import.meta.env.VITE_FILES_URL}/${post?.user?.picture}` : '/profile.jpg'} />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-[20px]">
                        <div className="text-xs text-subtitle">{post?.user?.username} • {new Date(post?.created_at)?.toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })?.replace(" AM", "am")?.replace(" PM", "pm")}</div>
                        {post?.user?.moderator && <div className="mt-[-2px] text-white bg-blue h-4 w-4 rounded-full text-[8px] flex items-center justify-center"><FaCheck /></div>}
                    </div>
                </Link>
            </div>
            {post?.name && <div className='font-bold'>{post?.name}</div>}
            {post?.media && (post.media.endsWith('jpg') ? <img className='max-w-[300px] rounded-md' src={`${import.meta.env.VITE_FILES_URL}/${post?.media}`} /> :
                <video className="sm:max-w-[400px] mb-2" autoPlay muted loop playsInline controls>
                    <source
                        src={`${import.meta.env.VITE_FILES_URL}/${post?.media}`}
                        type="video/mp4"
                    />
                </video>)}
            <div className={`feed  overflow-y-clip mb-4`} dangerouslySetInnerHTML={{ __html: post?.content }} />
            {![null, undefined].includes(post?.totalComments?.a?.a) ? <div className='text-subtitle'>{`${post?.totalComments?.a?.a} comment${post?.totalComments?.a?.a === 1 ? '' : 's'}`}</div> : null}
        </Link>
        {post?.comments?.length ?
            <div className="flex flex-row w-full">
                <div
                    onClick={() => { setHide(!hide) }}
                    className={`h-full p-[20px] ${hide && `w-full`} flex flex-col text-left cursor-pointer text-xs hover:opacity-50 text-subtitle`}>
                    {hide ? `+ Show ${post.comments.length} ${post.comments.length === 1 ? 'reply' : 'replies'}` : `-`}
                </div>
                {!hide ? <div className="flex flex-col w-[calc(100%_-_40px)]">
                    {post.comments.map((comment, index) =>
                        <PostComponent
                            key={index}
                            post={comment}
                            setEditPost={setEditPost}
                        />)}
                </div> : null}
            </div>
            : null
        }
    </>)
}
