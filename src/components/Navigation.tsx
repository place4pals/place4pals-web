import { styles, useGlobalStore } from "#src/utils";
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader } from ".";
import { usePostHog } from 'posthog-js/react';
import { useQuery } from "@tanstack/react-query";
import * as Auth from "aws-amplify/auth";
import * as API from "aws-amplify/api";
import { FaMoon, FaSun } from 'react-icons/fa';
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
            query: `query($id: uuid!) {
                users_by_pk(id: $id) {
                  username
                  picture
                }
              }
              `,
            variables: {
                id: authenticated
            }
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

    useEffect(() => darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark'), [darkMode]);

    useEffect(() => window.scrollTo(0, 0), [location]);

    const menuClass = `flex flex-row gap-1 items-center p-2 rounded-xl select-none outline-none data-[highlighted]:bg-background data-[highlighted]:text-primary`;

    return (
        <div className={`bg-background text-text m-auto flex flex-col items-center justify-center gap-2 sm:mt-2`}>
            {loading && <Loader />}
            <div className='flex flex-row justify-between w-full max-w-screen-xl bg-card px-4 py-2 h-[50px] shadow-shadow shadow-[2px_2px_0_1px_#000] border-text sm:border-[1px] sm:rounded-md border-y-[1px]'>
                <div className='flex flex-row items-center gap-2'>
                    <Link to={'/'} className={`hover:opacity-50 flex flex-row items-center gap-1`}>
                        <img className='h-[30px] w-[30px]' src={'/logo.png'} />
                        <span className='text-xl'>place4pals</span>
                    </Link>
                    <button className='hover:opacity-50 rounded-full p-1 bg-[#666] text-white text-xs' onClick={(e) => setDarkMode(!darkMode)}>
                        {darkMode ? <FaSun /> : <FaMoon />}
                    </button>
                    {[{
                        name: '= Feed',
                        to: '/'
                    }, {
                        name: '≈ Pools',
                        to: '/pools'
                    }, {
                        name: '⇆ Chat',
                        to: '/chat'
                    }].map((obj, index) => <Link key={index} className={`${location.pathname === obj.to ? 'bg-black hover:opacity-100' : 'bg-subtitle'} text-white py-[0px] ${styles.button}`} to={obj?.to}>{obj?.name}</Link>)}
                </div>
                <div className='flex flex-row items-center gap-2'>
                    {(!authenticated ? [{
                        name: 'Login',
                        color: 'bg-primary',
                        to: '/login'
                    }, {
                        name: 'Sign up',
                        color: 'bg-secondary',
                        to: '/signup'
                    }] : []).map((obj, index) => <Link key={index} className={`${obj?.color} text-white py-[0px] ${styles.button}`} to={obj?.to}>{obj?.name}</Link>)}
                    {authenticated && <Link className='hover:opacity-50 mr-[-5px] flex flex-row items-center gap-1' to='/settings'>
                        <img className='h-[30px] w-[30px] rounded-full border-[1px] border-text' src={user?.picture ? `${import.meta.env.VITE_FILES_URL}/${user?.picture}` : '/profile.jpg'} />
                        <div>{user?.username}</div>
                    </Link>}
                </div>
            </div>
            <div className='min-h-[calc(100vh_-_300px)] max-w-screen-xl w-full'>
                <Outlet />
            </div>
        </div>
    )
}