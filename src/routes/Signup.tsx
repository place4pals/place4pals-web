import { useState, useRef } from 'react';
import * as Auth from 'aws-amplify/auth';;
import { useNavigate } from 'react-router-dom';
import * as API from 'aws-amplify/api';
import { sleep, styles, useGlobalStore } from '#src/utils';
import { useQueryClient } from '@tanstack/react-query';
import { usePostHog } from 'posthog-js/react';

export const Signup = () => {
    const queryClient = useQueryClient();
    const formRef = useRef(null);
    const setAuthenticated = useGlobalStore(state => state.setAuthenticated);
    const loading = useGlobalStore(state => state.loading);
    const setLoading = useGlobalStore(state => state.setLoading);
    const darkMode = useGlobalStore(state => state.darkMode);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const navigate = useNavigate();
    const posthog = usePostHog()

    const signup = async (e) => {
        e.preventDefault();
        const { username, email, password, terms } = Object.fromEntries(new FormData(e.currentTarget));
        if (!terms) {
            alert(`You must agree to the Terms of Service and Privacy Policy`);
            return;
        }
        setLoading('Signing up...');
        try {
            await Auth.signUp({
                username: crypto.randomUUID(),
                password: password.toString(),
                options: {
                    userAttributes: {
                        email: email.toString().toLowerCase(),
                        nickname: username.toString(),
                    },
                    autoSignIn: { enabled: true }
                }
            });
            await sleep(2000);
            await Auth.autoSignIn();
            const attributes = (await Auth.fetchAuthSession()).tokens?.idToken?.payload
            setAuthenticated(attributes?.sub);
            posthog?.identify(attributes?.sub, { email: attributes?.email });
            setLoading(false);
            if (phoneNumber) {
                Auth.sendUserAttributeVerificationCode({ userAttributeKey: 'phone_number' });
            }
            queryClient.refetchQueries({ queryKey: ['user'] });
            navigate('/?new=1');
        }
        catch (err) {
            setLoading(false);
            setError(err?.message);
        }
    }

    return (<div className={`w-full m-auto ${styles.container}`}>
        <form ref={formRef} onSubmit={signup} className={`${styles.form}`}>
            <div className='font-header text-center text-xl'>Sign up</div>
            <input name="username" type="text" placeholder='Username' className={`${styles.input}`} />
            <input name="email" type="text" placeholder='Email address' className={`${styles.input}`} />
            <input name="password" type="password" placeholder='Password' className={`${styles.input}`} />
            {success && <div className={`${styles.success}`}>{success}</div>}
            {error && <div className={`${styles.error}`}>{error}</div>}
            <div className='flex flex-row gap-2 items-center justify-center text-sm sm:text-base'>
                <input id="terms" name="terms" type="checkbox" className='h-5 w-5' />
                <label htmlFor="terms">
                    {`I agree to the `}
                    <a target="_blank" rel="noreferrer" href="/terms" className='underline hover:opacity-50'>
                        {`Terms of Service`}
                    </a>{` & `}
                    <a target="_blank" rel="noreferrer" href="/privacy" className='underline hover:opacity-50'>
                        {`Privacy Policy`}
                    </a>
                </label>
            </div>
            <button disabled={loading} className={`${styles.button} bg-primary text-[white]`}>Sign up</button>
        </form>
    </div>)
}