import { useState } from 'react';
import * as Auth from 'aws-amplify/auth';;
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalStore } from '#src/utils';

export const Reset = () => {
    const loading = useGlobalStore(state => state.loading);
    const setLoading = useGlobalStore(state => state.setLoading);
    const setAuthenticated = useGlobalStore(state => state.setAuthenticated);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const resetPassword = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const urlParams = new URLSearchParams(location.search);
            const username = urlParams.get('username');
            const code = urlParams.get('code');
            const { password, confirm } = Object.fromEntries(new FormData(e.currentTarget));

            if (!username || !code) {
                throw Error('This reset password link is no longer valid');
            }
            if (!password || !confirm) {
                throw Error('You must fill out both fields');
            }
            else if (password !== confirm) {
                throw Error('Make sure your passwords match');
            }
            else if (password.length < 6) {
                throw Error('Your password must be at least 6 characters long');
            }

            await Auth.confirmResetPassword({ username, confirmationCode: code, newPassword: password.toString() });
            setLoading(false);
            setSuccess('Success! Logging in...');
            await Auth.signIn({ username, password });
            const attributes = (await Auth.fetchAuthSession()).tokens?.idToken?.payload
            setAuthenticated(attributes?.sub);
            navigate('/dashboard');
        }
        catch (err) {
            setLoading(false);
            setError(err.message);
        }
    }

    return (
        <div className="max-w-screen-sm m-auto flex flex-col gap-4 bg-card p-5 sm:p-10 rounded-xl shadow-lg">
            <form onSubmit={resetPassword} className="flex flex-col gap-4 mb-8">
                <div className='font-header text-center'>Reset your password</div>
                {success && <div className='bg-successBackground border border-successBorder p-2 rounded-xl'>{success}</div>}
                {error && <div className='bg-errorBackground border border-errorBorder p-2 rounded-xl'>{error}</div>}
                <input className="p-2 rounded-lg bg-background" name="password" type="password" placeholder='Password' />
                <input className="p-2 rounded-lg bg-background" name="confirm" type="password" placeholder='Confirm password' />
                <button className="bg-primary text-white p-2 rounded-lg hover:opacity-50" disabled={loading}>Reset password & log in</button>
            </form>
        </div>
    )
}