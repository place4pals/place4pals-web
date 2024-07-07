import { useGlobalStore } from "#src/utils";
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader } from ".";
import { usePostHog } from 'posthog-js/react';
import { useQuery } from "@tanstack/react-query";
import * as Auth from "aws-amplify/auth";
import * as API from "aws-amplify/api";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AiOutlineMenu } from "react-icons/ai";
const apiClient = API.generateClient();

export const Navigation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const darkMode = useGlobalStore(state => state.darkMode);
    const setDarkMode = useGlobalStore(state => state.setDarkMode);
    const loading = useGlobalStore(state => state.loading);
    const authenticated = useGlobalStore(state => state.authenticated);
    const setAuthenticated = useGlobalStore(state => state.setAuthenticated);
    const posthog = usePostHog();

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: async () => (await apiClient.graphql({
            query: `query($id: uuid!) {users_by_pk(id: $id) { username picture }}`,
            variables: { id: authenticated },
        }))?.data?.users_by_pk,
        refetchOnWindowFocus: false,
    });


    const authRoutes = ['/', '/login', '/signup', '/forgot', '/reset', '/verify', '/terms', '/privacy'];
    useEffect(() => {
        const async = async () => {
            const attributes = (await Auth.fetchAuthSession()).tokens?.idToken?.payload;
            if (!attributes) {
                setAuthenticated(false);
                if (!authRoutes.includes(location.pathname) || location.pathname === '/') {
                    navigate(`/${location.search}`);
                }
            }
            else {
                setAuthenticated(attributes?.sub);
                posthog?.identify(attributes?.sub, { email: attributes?.email });
                await Auth.fetchAuthSession({ forceRefresh: true });
            }
        }
        async();
    }, []);

    useEffect(() => { darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark') }, [darkMode]);

    useEffect(() => { window.scrollTo(0, 0) }, [location]);

    return (
        <div className={`bg-background text-text m-auto flex flex-col items-center justify-center gap-2`}>
            {loading && <Loader />}
            <div className='flex flex-row justify-between w-full max-w-screen-lg px-4 py-2 h-[50px] border-b-[1px] border-border'>
                <div className='flex flex-row items-center gap-2'>
                    <Link to={'/'} className={`hover:opacity-50 flex flex-row items-center gap-1`}>
                        <img className='h-[30px] w-[30px]' src={'/logo.png'} />
                        <span className='text-xl'>place4pals</span>
                    </Link>
                    <div className={`hidden sm:block cursor-pointer text-blue hover:underline`}
                        onClick={(e) => { e.preventDefault(); setDarkMode(!darkMode); }}>{darkMode ? '☼' : '☾'}</div>
                </div>
                <div className='hidden sm:flex flex-row items-center gap-4'>
                    {[
                        { title: '= Feed', to: '/' },
                        { title: '≈ Pools', to: '/pools' },
                        { title: '⇆ Chat', to: '/chat' },
                        { separator: true },
                        { title: 'Login', to: '/login' },
                        { title: 'Signup', to: '/signup' },
                    ].map((obj, index) => obj.separator ? <div className='w-[1px] h-4 bg-border' /> : <Link key={index} className={`text-blue hover:underline ${location.pathname === obj.to ? 'font-bold' : ''}`} to={obj.to}>{obj.title}</Link>)}
                </div>
                <div className='block sm:hidden'>
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <div className='flex flex-row items-center gap-2 cursor-pointer hover:opacity-50'>
                                {authenticated && <>
                                    <img className='h-[30px] w-[30px] rounded-full border-[1px] border-border' src={user?.picture ?? '/profile.jpg'} />
                                    <div className='hidden sm:block'>{user?.name?.split(' ')?.[0] ?? 'User'}</div>
                                </>}
                                <AiOutlineMenu className='text-2xl mr-4' />
                            </div>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className="min-w-[180px] bg-card text-text p-2 shadow-xl border-[1px] border-border will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade z-10 flex flex-col gap-4 rounded-lg overflow-y-scroll max-h-[calc(100vh_-_150px)]"
                                sideOffset={5}
                            >
                                {(!authenticated ? [
                                    { name: 'Home', to: '/' },
                                    { name: 'Login', to: '/login' },
                                    { name: 'Signup', to: '/signup' },
                                ] : [
                                    { name: 'Dashboard', to: '/dashboard' },
                                    { name: 'Settings', to: '/settings' },
                                ]).map((obj, index) =>
                                    <DropdownMenu.Item key={index} className={`flex flex-row gap-1 items-center p-2 select-none outline-none data-[highlighted]:bg-background rounded-sm ${location.pathname === obj.to && 'text-blue font-bold'}`}
                                        onSelect={() => { navigate(obj.to) }}
                                    >
                                        {obj.name}
                                    </DropdownMenu.Item>)}
                                <DropdownMenu.Item className={`flex flex-row gap-1 items-center p-2 select-none outline-none data-[highlighted]:bg-background rounded-sm`}
                                    onSelect={(e) => { e.preventDefault(); setDarkMode(!darkMode); }}
                                >
                                    Dark mode
                                    <div className="ml-auto w-6 h-3 bg-[#999] rounded-full">
                                        <div className={`w-3 h-3 bg-blue rounded-full ${darkMode ? 'ml-auto' : ''}`} />
                                    </div>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>
            </div>
            <div className='min-h-[calc(100vh_-_300px)] max-w-screen-xl w-full'>
                <Outlet />
            </div>
        </div>
    )
}