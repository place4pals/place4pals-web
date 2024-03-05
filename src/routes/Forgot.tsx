import { useState } from 'react';
import * as Auth from 'aws-amplify/auth';
import { useGlobalStore } from '#src/utils';

export const Forgot = () => {
    const loading = useGlobalStore(state => state.loading);
    const setLoading = useGlobalStore(state => state.setLoading);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const sendResetLink = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { email } = Object.fromEntries(new FormData(e.currentTarget));
            if (!email) {
                throw Error;
            }
            await Auth.resetPassword({ username: email.toString() });
            setSuccess(`Success! Please check your email address for a link to reset your password`);
            setLoading(false);
        }
        catch (err) {
            setLoading(false);
            console.log(err);
            setError('You must enter an email address');
        }
    }

    return (
        <div className="max-w-screen-sm m-auto flex flex-col gap-4 bg-card p-5 sm:p-10 rounded-xl shadow-lg">
            <form onSubmit={sendResetLink} className="flex flex-col gap-4 mb-8">
                <div className='font-header text-center'>Forgot your password?</div>
                {success && <div className='bg-successBackground border border-successBorder p-2 rounded-xl'>{success}</div>}
                {error && <div className='bg-errorBackground border border-errorBorder p-2 rounded-xl'>{error}</div>}
                <input className="p-2 rounded-lg bg-background" name="email" type="text" placeholder='Email address' />
                <button className="bg-primary text-white p-2 rounded-lg hover:opacity-50" disabled={loading}>Send link to reset</button>
            </form>
        </div>
    )
}