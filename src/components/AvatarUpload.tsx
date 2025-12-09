import { Camera, X, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toastError, toastSuccess } from '../utils/toastNotify';
import authStore from '../authentica/authentication.store';
import { ProfileAvatar } from './ProfileAvatar';

interface AvatarUploadProps {
  name?: string;
  currentAvatarUrl?: string | null;
  onAvatarChange?: (newUrl: string | null) => void;
  size?: 'md' | 'lg' | 'xl';
}

export const AvatarUpload = ({ 
  name, 
  currentAvatarUrl, 
  onAvatarChange,
  size = 'xl' 
}: AvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const user = authStore.getUser() as any;
  const clienteId = user?.clienteId;

  const sizeClasses = {
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clienteId) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toastError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toastError('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${clienteId}/avatar.${fileExt}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        toastError('Erro ao fazer upload da imagem');
        return;
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const newAvatarUrl = publicUrlData.publicUrl + '?t=' + Date.now();

      // Salvar referência no banco
      const { error: dbError } = await supabase
        .from('user_avatars')
        .upsert({
          cliente_id: clienteId,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'cliente_id' });

      if (dbError) {
        console.error('Erro ao salvar referência:', dbError);
        // Mesmo com erro no banco, a imagem foi enviada
      }

      setAvatarUrl(newAvatarUrl);
      onAvatarChange?.(newAvatarUrl);
      toastSuccess('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toastError('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!clienteId) return;
    
    setIsUploading(true);

    try {
      // Remover do storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([`${clienteId}/avatar.jpg`, `${clienteId}/avatar.png`, `${clienteId}/avatar.jpeg`, `${clienteId}/avatar.webp`]);

      if (deleteError) {
        console.warn('Aviso ao remover arquivo:', deleteError);
      }

      // Atualizar banco
      await supabase
        .from('user_avatars')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('cliente_id', clienteId);

      setAvatarUrl(null);
      onAvatarChange?.(null);
      toastSuccess('Foto removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover avatar:', error);
      toastError('Erro ao remover foto');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative group">
      {/* Avatar ou foto */}
      {avatarUrl ? (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-lg`}>
          <img 
            src={avatarUrl} 
            alt="Avatar do usuário" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <ProfileAvatar name={name} size={size} showIcon />
      )}

      {/* Overlay de loading */}
      {isUploading && (
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-black/50 flex items-center justify-center`}>
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      {/* Botões de ação (aparecem no hover) */}
      {!isUploading && (
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100`}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-primary rounded-full text-white hover:bg-primary/80 transition-colors"
            title="Alterar foto"
          >
            <Camera className="w-4 h-4" />
          </button>
          
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="p-2 bg-destructive rounded-full text-white hover:bg-destructive/80 transition-colors"
              title="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};