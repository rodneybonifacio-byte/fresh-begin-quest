import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface URLParamsConfig<T extends Record<string, string>> {
    defaultValues: T;
    syncWithURL?: boolean;
}

export function useURLParams<T extends Record<string, string>>({ 
    defaultValues,
    syncWithURL = true 
}: URLParamsConfig<T>) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [params, setParams] = useState<T>(() => {
        const initialParams = { ...defaultValues };
        
        // Inicializa com valores da URL se existirem, senão usa os valores padrão
        Object.keys(defaultValues).forEach(key => {
            const urlValue = searchParams.get(key);
            if (urlValue !== null) {
                (initialParams as Record<string, string>)[key] = urlValue;
            }
        });
        
        return initialParams as T;
    });

    // Sincroniza parâmetros com a URL
    useEffect(() => {
        if (!syncWithURL) return;

        const currentUrlParams = new URLSearchParams(window.location.search);
        const newSearchParams = new URLSearchParams();
        let needsUpdate = false;

        // Compara cada parâmetro com a URL atual
        Object.entries(params).forEach(([key, value]) => {
            const urlValue = currentUrlParams.get(key);
            if (value && urlValue !== value) {
                needsUpdate = true;
            }
            if (value || value === '') {
                newSearchParams.set(key, value);
            }
        });

        // Só atualiza a URL se houver mudanças reais
        if (needsUpdate) {
            setSearchParams(newSearchParams, { replace: true });
        }
    }, [params, syncWithURL, setSearchParams]);

    // Atualiza o estado local quando a URL muda externamente
    useEffect(() => {
        const newState: Record<string, string> = {};
        let needsUpdate = false;

        Object.keys(defaultValues).forEach(key => {
            const urlValue = searchParams.get(key);
            const currentValue = params[key];
            
            if (urlValue !== null && urlValue !== currentValue) {
                newState[key] = urlValue;
                needsUpdate = true;
            } else if (urlValue === null && currentValue !== defaultValues[key]) {
                newState[key] = defaultValues[key];
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            setParams(prev => ({ ...prev, ...newState }) as T);
        }
    }, [searchParams, defaultValues]);

    // Função para atualizar um único parâmetro
    const setParam = useCallback((key: keyof T, value: string) => {
        setParams(prev => ({ ...prev, [key]: value }));
    }, []);

    // Função para atualizar múltiplos parâmetros
    const setMultipleParams = useCallback((newParams: Partial<T>) => {
        setParams(prev => ({ ...prev, ...newParams }));
    }, []);

    // Função para resetar os parâmetros para os valores padrão
    const resetParams = useCallback(() => {
        setParams(defaultValues);
    }, [defaultValues]);

    return {
        params,
        setParam,
        setMultipleParams,
        resetParams
    };
}