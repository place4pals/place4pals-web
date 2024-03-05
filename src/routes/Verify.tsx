import { Loader } from "#src/components";
import * as API from "aws-amplify/api";
import * as Auth from "aws-amplify/auth";
import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom";
const apiClient = API.generateClient();

export const Verify = () => {
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        const async = async () => {
            if (location.search) {
                try {
                    await Auth.fetchAuthSession({ forceRefresh: true });
                }
                catch (err) {
                    navigate(`/login${location.search}`);
                }
                const params = new URLSearchParams(location.search);
                const type = params.get('type');
                const code = params.get('code');
                await Auth.confirmUserAttribute({ userAttributeKey: type, confirmationCode: code });
                await Auth.fetchAuthSession({ forceRefresh: true });
                const attributes = (await Auth.fetchAuthSession()).tokens?.idToken?.payload;
                await apiClient.graphql({
                    query: `mutation($value: String) { update_users(where: {}, _set: {${type}: $value}) { affected_rows }}`,
                    variables: { value: attributes?.[type] }
                });
                alert(`You've successfully verified your new ${type?.replace('_', ' ')}`);
                navigate('/dashboard');
            }
        }
        async();
    }, [location.search]);
    return (<div className="pt-24"><Loader inner /></div>)
}