import { useState } from 'react';
import * as Auth from 'aws-amplify/auth';
import { styles, useGlobalStore } from '#src/utils';

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
        <div className={`${styles.container}`}>
            <form onSubmit={sendResetLink} className={`${styles.form}`}>
                <div className='font-header text-center'>Forgot your password?</div>
                {success && <div className={`${styles.success}`}>{success}</div>}
                {error && <div className={`${styles.error}`}>{error}</div>}
                <input className={`${styles.input}`} name="email" type="text" placeholder='Email address' />
                <button className={`bg-primary text-white ${styles.button}`} disabled={loading}>Send link to reset</button>
            </form>
        </div>
    )
}