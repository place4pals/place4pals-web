import { useState, useEffect } from 'react';
import * as Auth from 'aws-amplify/auth';;
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGlobalStore } from '#src/utils';
import { useQueryClient } from '@tanstack/react-query';
import { usePostHog } from 'posthog-js/react';

export const Login = () => {
    const queryClient = useQueryClient();
    const loading = useGlobalStore(state => state.loading);
    const setLoading = useGlobalStore(state => state.setLoading);
    const setAuthenticated = useGlobalStore(state => state.setAuthenticated);
    const [error, setError] = useState('');
    const [checked, setChecked] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const posthog = usePostHog();

    useEffect(() => {
        const async = async () => {
            if (location.search) {
                const params = new URLSearchParams(location.search);
                if (params.get('code')) {
                    setError(`You must login before you can verify your new ${params.get('type')?.replace('_', ' ')}`)
                }
            }
        }
        async();
    }, [location.search])

    const login = async (e) => {
        e.preventDefault();
        setError('');
        setLoading('Logging in...');
        const { email, password } = Object.fromEntries(new FormData(e.currentTarget));
        try {
            await Auth.signIn({
                username: email.toString(),
                password: password.toString(),
            });
            const attributes = (await Auth.fetchAuthSession()).tokens?.idToken?.payload;
            console.log(attributes?.sub);
            setAuthenticated(attributes?.sub);
            setLoading(false);
            posthog?.identify(attributes?.sub, { email: attributes?.email });

            const params = new URLSearchParams(location.search);
            if (params.get('code')) {
                navigate(`/verify/${location.search}`);
            }
            else {
                navigate('/dashboard');
            }

            const hasuraClaims = JSON.parse(attributes?.['https://hasura.io/jwt/claims']);
            if (hasuraClaims?.['x-hasura-default-role'] === 'cancelled') {
                navigate('/subscriptions');
            }
            // Wrapping in setTimeout to allow global state "authenticated" to propogate before refetching user
            setTimeout(() => queryClient.refetchQueries({ queryKey: ['user'] }), 100);
        }
        catch (err) {
            console.log(err);
            setLoading(false);
            setError(confirm?.error?.message ?? `There was an issue logging in. Please try again.`);
        }
    }

    return (<div className="flex flex-col gap-4 bg-card p-5 rounded-xl">
        <form onSubmit={login} className="flex flex-col gap-4">
            <div className='font-header text-center text-2xl'>Welcome back!</div>
            {error && <div className='bg-errorBackground border border-errorBorder p-2 rounded-md'>{error}</div>}
            <input className="p-2 rounded-md bg-background" name="email" type="text" placeholder='Email address' />
            <input className="p-2 rounded-md bg-background" name="password" type="password" placeholder='Password' />
            <div className='flex flex-row justify-between gap-2'>
                <Link className='underline text-sm sm:text-base hover:opacity-50' to="/forgot">Forgot your password?</Link>
                <div className='flex flex-row gap-2 text-sm sm:text-base'>
                    <input checked={checked} onChange={() => setChecked(!checked)} className='h-6 w-6' id='remember' name='remember' type="checkbox" />
                    <label htmlFor='remember'>Remember me</label>
                </div>
            </div>
            <button className="bg-secondary text-[white] p-2 rounded-md hover:opacity-50" disabled={loading}>Log in</button>
        </form>
        <div className='font-header text-center'>Don't have an account?</div>
        <Link to="/signup" className="text-center bg-primary text-[white] p-2 rounded-md hover:opacity-50">Sign up for free</Link>
    </div>)
}