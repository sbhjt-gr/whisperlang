import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

interface UseAuthReturn {
  user: User | null;
}

export default function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user: User | null) => {
            if(user) {
                setUser(user);
            } else {
                setUser(null);
            }
        });
        return unsub;
    }, []);
    
    return { user };
} 