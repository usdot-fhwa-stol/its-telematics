/*
 * Copyright (C) 2019-2026 LEIDOS.
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

/**
 * Shared mobile styling utilities for authentication pages
 * These functions provide consistent mobile-responsive styles across Login, Forgot Password, and Register User pages
 */
export const getMobileWrapperStyles = (isMobile) => {
    if (!isMobile) return { display: 'contents' };
    return {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 0',
        transform: 'translateZ(0)',
        zIndex: 1,
        overflowY: 'auto',
    };
};

export const getMobileContainerStyles = (isMobile) => {
    if (!isMobile) return {};
    return {
        padding: '0 20px',
        margin: 0,
        maxWidth: '100vw !important',
        overflow: 'visible',
        height: 'auto',
    };
};

export const getMobileBoxStyles = (isMobile, marginTop = 8) => {
    if (!isMobile) {
        return {
            marginTop,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
        };
    }
    return {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '400px',
    };
};

export const getTextFieldStyles = (isMobile) => {
    if (!isMobile) return {};
    return {
        '& .MuiInputBase-root': {
            fontSize: '16px',
        },
        '& .MuiInputLabel-root': {
            fontSize: '16px',
        }
    };
};
