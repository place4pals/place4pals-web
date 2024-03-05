import { useEffect, useRef, useState } from 'react';
import { compressImage, isStaging, useGlobalStore } from '#src/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as API from 'aws-amplify/api';
import * as Auth from 'aws-amplify/auth';;
import { MdOutlineDeleteForever } from 'react-icons/md';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'
import flags from 'react-phone-number-input/flags'
const apiClient = API.generateClient();

export const Settings = () => {
    const queryClient = useQueryClient();
    const loading = useGlobalStore(state => state.loading);
    const setLoading = useGlobalStore(state => state.setLoading);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const formRef = useRef(null);

    const { data } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => (await apiClient.graphql({
            query: `query($id: uuid!) {
                users_by_pk(id: $id) {
                  id
                  email
                  name
                  phone_number
                  picture
                  email_notifications
                  sms_notifications
                }
              }
              `,
            variables: {
                id: (await Auth.fetchAuthSession()).tokens?.idToken?.payload.sub,
            }
        }))?.data?.users_by_pk,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (data?.phone_number) {
            setPhoneNumber(data?.phone_number);
        }
    }, [data]);

    const saveChanges = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const { name, email, email_notifications, sms_notifications } = Object.fromEntries(new FormData(e.currentTarget));
            await Auth.fetchAuthSession({ forceRefresh: true });

            const response = await (await API.post({
                apiName: 'auth', path: '/updateUser', options: {
                    body: {
                        ...name !== data?.name && ({ name }),
                        ...email !== data?.email && ({ email }),
                        ...phoneNumber !== data?.phone_number && ({ phone_number: phoneNumber }),
                        ...email_notifications !== data?.email_notifications && ({ email_notifications: !!email_notifications }),
                        ...sms_notifications !== data?.sms_notifications && ({ sms_notifications: !!sms_notifications }),
                    }
                }
            }).response).body.json();
            setLoading(false);
            setError('');

            if (response.includes('phone number')) {
                Auth.sendUserAttributeVerificationCode({ userAttributeKey: 'phone_number' });
            }
            setFormChanged(false);
            setSuccess(response ?? `Profile successfully updated!`);
        }
        catch (err) {
            setLoading(false);
            setSuccess('');
            setError(err?.response?.data);
            for (const attribute of ['name', 'email', 'phone_number']) {
                formRef.current.elements[attribute].value = data?.[attribute];
            }
        }
    }

    const onFileChange = async (e) => {
        if (!e?.target?.files?.[0]) return;
        try {
            setLoading(true);
            const base64 = await compressImage({ file: e?.target?.files?.[0], isProfile: true });
            const picture = await (await API.post({ apiName: 'auth', path: '/uploadImage', options: { body: { base64 } } }).response).body.json();
            await apiClient.graphql({
                query: `mutation($picture: String) { update_users(where: {}, _set: {picture: $picture}) { affected_rows }}`,
                variables: { picture: `https://uploads${isStaging ? '-staging' : ''}.place4pals.com/${picture}` }
            });
            await queryClient.refetchQueries({ queryKey: ['profile'] });
            await queryClient.refetchQueries({ queryKey: ['user'] });
            setLoading(false);
        }
        catch (err) {
            console.log(err);
            setLoading(false);
        }
    }

    const deletePicture = async () => {
        if (confirm(`Are you sure you want to remove your profile picture?`)) {
            setLoading(true);
            try {
                await apiClient.graphql({
                    query: `mutation($picture: String) { update_users(where: {}, _set: {picture: $picture}) { affected_rows }}`,
                    variables: { picture: null }
                });
                await queryClient.refetchQueries({ queryKey: ['profile'] });
                await queryClient.refetchQueries({ queryKey: ['user'] });
                setLoading(false);
            }
            catch (err) {
                console.log(err);
                setLoading(false);
            }
        }
    }

    const [formChanged, setFormChanged] = useState(false);
    const onChange = (e) => {
        const { name, email, email_notifications, sms_notifications } = Object.fromEntries(new FormData(e.currentTarget));
        if (
            (name !== data?.name) ||
            (email !== data?.email) ||
            (!!email_notifications !== data?.email_notifications) ||
            (!!sms_notifications !== data.sms_notifications)
        ) {
            setFormChanged(true);
        }
        else {
            setFormChanged(false);
        }
    }

    return (
        <div className={`flex flex-col gap-4 bg-card p-4 rounded-lg max-w-screen-sm mx-auto`}>
            <div className='flex flex-row items-center justify-between'>
                <div className='font-bold text-xl select-none'>Settings</div>
                <div />
            </div>
            <form onChange={onChange} ref={formRef} onSubmit={saveChanges} className="flex flex-col gap-4 mb-8">
                <div className='flex flex-row justify-between items-center gap-2'>
                    <label htmlFor='name' className='w-28'>Picture</label>
                    <label htmlFor="file" className="cursor-pointer mr-auto">
                        <img className='w-20 h-20 rounded-full hover:opacity-50 object-contain' src={data?.picture ?? '/profile.png'} />
                        <input id="file" type="file" className="hidden" onChange={onFileChange} />
                    </label>
                    {data?.picture ?
                        <button className="flex flex-row items-center hover:opacity-50" onClick={() => deletePicture()}><MdOutlineDeleteForever size={14} />Delete Picture</button> :
                        <div>Click icon to add picture</div>
                    }
                </div>
                <div className='flex flex-row justify-between items-center'>
                    <label htmlFor='name' className='w-32'>Name</label>
                    <input id='name' name="name" type="text" placeholder='Full name' className="p-2 rounded-lg bg-background w-full" defaultValue={data?.name} />
                </div>
                <div className='flex flex-row justify-between items-center'>
                    <label htmlFor='email' className='w-32'>Email</label>
                    <input id='email' name="email" type="text" placeholder='Email address' className="p-2 rounded-lg bg-background w-full" defaultValue={data?.email} />
                </div>
                <div className='flex flex-row justify-between items-center relative'>
                    <label htmlFor='phone_number' className='w-32'>Phone</label>
                    <PhoneInput
                        id="phone_number"
                        international={false}
                        className="p-2 rounded-lg bg-background w-[calc(100%_-_90px)] sm:w-full"
                        flags={flags}
                        defaultCountry="US"
                        placeholder="Phone number"
                        value={phoneNumber}
                        onChange={setPhoneNumber} />
                    <div className=' absolute right-4 top-3 sm:top-2 italic text-grey text-xs sm:text-base'>Optional</div>
                </div>
                <div className='flex flex-row'>
                    <label className='w-32'>Alerts</label>
                    <div className='flex flex-wrap gap-8'>
                        <div className='flex flex-row gap-2'>
                            <input defaultChecked={data?.email_notifications} id='email_notifications' name='email_notifications' type='checkbox' />
                            <label htmlFor='email_notifications'>Email Notifications</label>
                        </div>
                        <div className='flex flex-row gap-2'>
                            <input defaultChecked={data?.sms_notifications} id='sms_notifications' name='sms_notifications' type='checkbox' />
                            <label htmlFor='sms_notifications'>SMS Notifications</label>
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={loading || !formChanged} className={`bg-primary text-white p-2 rounded-lg mt-8 ${!formChanged && 'opacity-50'} hover:opacity-50`}>Save changes</button>
                {error && <div className='bg-errorBackground border border-errorBorder p-2 rounded-xl'>{error}</div>}
                {success && <div className='bg-successBackground border border-successBorder p-2 rounded-xl'>{success}</div>}
            </form>
        </div>
    )
}