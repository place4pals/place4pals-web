import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react'
import { useGlobalStore } from '#src/utils';

export const Home = () => {
    const navigate = useNavigate();
    const authenticated = useGlobalStore(state => state.authenticated);
    useEffect(() => {
        if (authenticated) {
            navigate('/dashboard');
        }
    }, []);
    return (<div className="flex flex-col gap-4 bg-card p-5 rounded-xl">
        Home
    </div>)
};