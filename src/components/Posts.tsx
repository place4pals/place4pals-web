import * as API from "aws-amplify/api";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { emptyUuid, useGlobalStore } from "#src/utils";
import { useVirtualizer } from '@tanstack/react-virtual'
import { ModalEditorComponent, PostComponent } from ".";
const apiClient = API.generateClient();

export const Posts = () => {
    const authenticated = useGlobalStore(state => state.authenticated);
    const [editPost, setEditPost] = useState(null);

    const { data: postsData, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ["posts", authenticated],
        queryFn: async ({ pageParam = 0 }) => (await apiClient.graphql({
            query: `query($userId: uuid){posts(limit: 10, offset: ${(pageParam) * 10}, order_by: {created_at: desc}) {
                id created_at name content media
                user { id username picture moderator }
                totalComments: comments_aggregate { a: aggregate { a: count } } 
                totalLikes: likes_aggregate { a: aggregate { a: count } }
                userLiked: likes(where: {user_id: {_eq: $userId}}) { id }
            }}`,
            variables: {
                userId: !authenticated ? emptyUuid : authenticated
            }
        }))?.data?.posts,
        refetchInterval: 10000,
        getNextPageParam: (lastPage, pages) => pages.length,
        initialPageParam: 0,
    });
    const posts = postsData?.pages?.flat();

    const handleScroll = (e) => {
        if (e.target.scrollTop > (e.target.scrollHeight - e.target.clientHeight - 200)) {
            !isFetchingNextPage && fetchNextPage();
        }
    }

    const postsRef = useRef(null);

    const rowVirtualizer = useVirtualizer({
        count: posts?.length ?? 0,
        getScrollElement: () => postsRef.current,
        estimateSize: () => 1000,
        overscan: 50,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <>
            <div className={`flex flex-col justify-start gap-4 max-w-screen-lg mx-auto relative max-h-[calc(100vh_-_200px)]`}>
                <div id='virtualScroll' ref={postsRef} onScroll={handleScroll} className={`overflow-y-scroll flex flex-col gap-2 `}>
                    <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                        <div style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItems?.[0]?.start ?? 0}px)`,
                        }}>
                            {virtualItems.map((virtualItem) => (
                                <div key={virtualItem.key} ref={rowVirtualizer.measureElement} data-index={virtualItem.index}>
                                    <PostComponent
                                        post={posts[virtualItem.index]}
                                        setEditPost={setEditPost}
                                    />
                                </div>
                            ))}
                        </div>
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
