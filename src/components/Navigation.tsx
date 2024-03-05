import { useGlobalStore } from "#src/utils";
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AiOutlineMenu } from "react-icons/ai";
import { Loader } from ".";
import { usePostHog } from 'posthog-js/react';
import { useQuery } from "@tanstack/react-query";
import * as Auth from "aws-amplify/auth";
import * as API from "aws-amplify/api";
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
                if (authRoutes.includes(location.pathname)) {
                    navigate('/dashboard');
                }
                const hasuraClaims = JSON.parse(attributes?.['https://hasura.io/jwt/claims']);
                if (hasuraClaims?.['x-hasura-default-role'] === 'cancelled') {
                    navigate('/subscriptions');
                }
            }
        }
        async();
    }, []);

    useEffect(() => darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark'), [darkMode]);

    useEffect(() => window.scrollTo(0, 0), [location]);

    const menuClass = `flex flex-row gap-1 items-center p-2 rounded-xl select-none outline-none data-[highlighted]:bg-background data-[highlighted]:text-primary`;

    return (
        <div className={`bg-background text-text m-auto ${!authenticated ? 'p-4' : 'py-4'} sm:p-4 flex flex-col items-center justify-center`}>
            {loading && <Loader />}
            {!authenticated &&
                <>
                    <div className='my-4 sm:my-8 flex flex-row justify-between w-full max-w-screen-lg bg-card rounded-xl px-4 py-2 h-[40px]'>
                        <div className='flex flex-row items-center gap-4'>
                            <Link to={'/'} className={`hover:opacity-50`}>
                                place4pals
                            </Link>
                            <button className='hover:opacity-50' onClick={(e) => setDarkMode(!darkMode)}>
                                {darkMode ? 'Light' : 'Dark'}
                            </button>
                        </div>
                        <div className='hidden sm:flex flex-row items-center gap-8'>
                            <Link className={`${location.pathname === '/' && 'text-primary'} hover:opacity-50`} to={'/'}>Home</Link>
                            <Link className='bg-secondary text-[white] rounded-xl px-4 py-1 hover:opacity-50 mr-[-20px]' to={'/login'}>Log in</Link>
                            <Link className='bg-primary text-[white] rounded-xl px-4 py-1 hover:opacity-50' to={'/signup'}>Sign up</Link>
                        </div>

                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <div className="sm:hidden flex flex-row items-center gap-x-2 cursor-pointer hover:text-primary">
                                    <AiOutlineMenu size={24} />
                                </div>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    className="flex flex-col gap-2 min-w-[150px] bg-card text-text rounded-xl p-2 z-10"
                                    sideOffset={5}
                                >
                                    <DropdownMenu.Item className={`${menuClass} ${location.pathname === '/' && 'text-primary'}`}
                                        onSelect={() => { navigate('/') }}
                                    >
                                        Home
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item className={`${menuClass} ${location.pathname === '/login' && 'text-primary'}`}
                                        onSelect={() => { navigate('/login') }}
                                    >
                                        Login
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item className={`${menuClass} ${location.pathname === '/signup' && 'text-primary'}`}
                                        onSelect={() => { navigate('/signup') }}
                                    >
                                        Sign Up
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Arrow className="fill-white" />
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    </div>
                    <div className='min-h-[calc(100vh_-_300px)] max-w-screen-sm w-full'>
                        <Outlet />
                    </div>
                    <div className=' max-w-screen-md text-xs text-subtitle text-center my-6'>
                    </div>
                </>
            }
            {authenticated &&
                <>
                    <div className='my-4 sm:my-8 flex flex-row justify-between w-full max-w-screen-lg bg-card rounded-xl px-4 py-2 h-[40px]'>
                        <div className='flex flex-row items-center gap-4'>
                            <Link to={'/'} className={`hover:opacity-50`}>
                                place4pals
                            </Link>
                            <button className='hover:opacity-50' onClick={(e) => setDarkMode(!darkMode)}>
                                {darkMode ? 'Light' : 'Dark'}
                            </button>
                        </div>

                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <div className="flex flex-row items-center gap-x-2 cursor-pointer hover:text-primary">
                                    <AiOutlineMenu size={24} />
                                </div>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    className="flex flex-col gap-2 min-w-[150px] bg-card text-text rounded-xl p-2 z-10"
                                    sideOffset={5}
                                >
                                    <DropdownMenu.Item className={`${menuClass} ${location.pathname === '/dashboard' && 'text-primary'}`}
                                        onSelect={() => { navigate('/dashboard') }}
                                    >
                                        Dashboard
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item className={`${menuClass} ${location.pathname === '/payment' && 'text-primary'}`}
                                        onSelect={() => { navigate('/payment') }}
                                    >
                                        Payment
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item className={`${menuClass} ${location.pathname === '/settings' && 'text-primary'}`}
                                        onSelect={() => { navigate('/settings') }}
                                    >
                                        Settings
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item className={`${menuClass}`}
                                        onSelect={async () => { await Auth.signOut(); setAuthenticated(false); navigate('/') }}
                                    >
                                        Log out
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Arrow className="fill-white" />
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    </div>
                    <div className='min-h-[calc(100vh_-_300px)] max-w-screen-sm w-full'>
                        <Outlet />
                    </div>
                    <div className=' max-w-screen-md text-xs text-subtitle text-center my-6'>
                    </div>
                </>
            }
        </div>
    )
}