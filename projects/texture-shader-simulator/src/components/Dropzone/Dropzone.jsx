import { useRef, useState } from 'react';
import './Dropzone.css';

const Dropzone = ({ onFile, accept = 'image/*', hint = 'JPG / PNG · used as height source' }) => {
  const inputRef = useRef(null);
  const [hover, setHover] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    onFile(file);
  };

  return (
    <div
      className={`dropzone${hover ? ' dropzone--hover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <div className="dropzone__icon" aria-hidden>+</div>
      <div className="dropzone__text">
        <strong>Drop file</strong> or click to browse
      </div>
      <div className="dropzone__hint">{hint}</div>
      <input
        ref={inputRef}
        className="dropzone__input"
        type="file"
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};

export default Dropzone;
