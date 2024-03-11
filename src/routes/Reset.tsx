import { useState } from 'react';
import * as Auth from 'aws-amplify/auth';;
import { useLocation, useNavigate } from 'react-router-dom';
import { styles, useGlobalStore } from '#src/utils';

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
            navigate('/');
        }
        catch (err) {
            setLoading(false);
            setError(err.message);
        }
    }

    return (
        <div className={`${styles.container}`}>
            <form onSubmit={resetPassword} className={`${styles.form}`}>
                <div className='font-header text-center'>Reset your password</div>
                {success && <div className={`${styles.success}`}>{success}</div>}
                {error && <div className={`${styles.error}`}>{error}</div>}
                <input className={`${styles.input}`} name="password" type="password" placeholder='Password' />
                <input className={`${styles.input}`} name="confirm" type="password" placeholder='Confirm password' />
                <button className={`bg-primary text-white ${styles.button}`} disabled={loading}>Reset password & log in</button>
            </form>
        </div>
    )
}