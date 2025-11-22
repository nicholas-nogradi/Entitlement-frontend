
// replace button with actual search icon later
// Fix search
export const SearchBar = () => {
  return (
    <div style={styles.container}>
      <form style={styles.form}>
        <input
          type="text"
          placeholder="Search entitlements..."
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Search
        </button>
      </form>
      <div style={styles.filters}>
        <select style={styles.select}>
          <option value="">All statuses</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELED">Canceled</option>
        </select>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'var(--card-background)',
    borderRadius: '0.5rem',
    boxShadow: 'var(--box-shadow)',
    padding: '1.5rem',
    marginBottom: '2rem'
  },
  
  form: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '0.25rem',
    fontSize: '1rem'
  },
  
  button: {
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.25rem',
    fontWeight: 500,
    transition: 'var(--transition)',
    cursor: 'pointer'
  },
  
  filters: {
    display: 'flex',
    gap: '1rem'
  },
  
  select: {
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    borderRadius: '0.25rem',
    backgroundColor: 'white'
  }
}

// const SearchBar = ({ onSearch }) => {
//   const [searchTerm, setSearchTerm] = useState('');

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     onSearch(searchTerm);
//   };

//   return (
//     <div className={styles.container}>
//       <form onSubmit={handleSubmit} className={styles.form}>
//         <input
//           type="text"
//           placeholder="Search entitlements..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className={styles.input}
//         />
//         <button type="submit" className={styles.button}>
//           Search
//         </button>
//       </form>
//       <div className={styles.filters}>
//         <select className={styles.select} onChange={(e) => onSearch(searchTerm, e.target.value)}>
//           <option value="">All statuses</option>
//           <option value="FULFILLED">Fulfilled</option>
//           <option value="PENDING">Pending</option>
//           <option value="CANCELED">Canceled</option>
//         </select>
//       </div>
//     </div>
//   );
