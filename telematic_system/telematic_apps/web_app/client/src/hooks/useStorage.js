/*
 * Copyright (C) 2019-2024 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Custom hook for cross-platform storage (web sessionStorage + mobile Capacitor Preferences)
 **/
export const useStorageString = (key, defaultValue = null) => {
    const isMobile = Capacitor.isNativePlatform();
    const [value, setValue] = useState(defaultValue);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initValue = async () => {
            try {
                if (isMobile) {
                    // Use Capacitor Preferences for mobile
                    const { value: storedValue } = await Preferences.get({ key });
                    setValue(storedValue || defaultValue);
                } else {
                    // Use sessionStorage for web
                    const storedValue = sessionStorage.getItem(key);
                    setValue(storedValue || defaultValue);
                }
                setIsInitialized(true);
            } catch (error) {
                console.error(`Error reading storage for key ${key}:`, error);
                setValue(defaultValue);
                setIsInitialized(true);
            }
        };

        initValue();
    }, [key, defaultValue, isMobile]);

const updateValue = async (newValue) => {

    try {
        if (isMobile) {
            await Preferences.set({ key, value: newValue || '' });
        } else {
            if (newValue === null) {
                sessionStorage.removeItem(key);
            } else {
                sessionStorage.setItem(key, newValue);
            }
        }
        setValue(newValue);
    } catch (error) {
        console.error(`[useStorage] Error writing storage for key ${key}:`, error);
    }
};

    return [value, updateValue, isInitialized];
};

export const useStorageNumber = (key, defaultValue = 0) => {
    const [stringValue, setStringValue, isInitialized] = useStorageString(key, String(defaultValue));

    const setValue = async (newValue) => {
        await setStringValue(String(newValue));
    };

    const numValue = stringValue ? Number(stringValue) : defaultValue;

    return [numValue, setValue, isInitialized];
};

export const useClearStorage = () => {
    const isMobile = Capacitor.isNativePlatform();

    const clearStorage = async () => {
        try {
            if (isMobile) {
                await Preferences.clear();
            } else {
                sessionStorage.clear();
            }
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    };

    return clearStorage;
};