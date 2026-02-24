export const ConectaFooter = () => {
  return (
    <footer className="py-10 px-4 sm:px-6 border-t border-gray-100 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-sm text-white">
              C+
            </div>
            <span className="font-semibold text-gray-600">BRHUB Conecta+</span>
          </div>
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} BRHUB Envios. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
};
